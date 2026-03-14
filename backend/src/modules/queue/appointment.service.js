const Appointment = require('./appointment.model');
const Booking = require('./booking.model');
const Doctor = require('../auth/doctor.model');
const Patient = require('../auth/patient.model');
const { AppError } = require('../../shared/middleware/error.middleware');

const ACTIVE_QUEUE_BOOKING_STATUS = 'confirmed';

const asDayRange = (value) => {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);
    const end = new Date(value);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
};

const getDoctorIdValue = (doctorRef) => {
    if (!doctorRef) return null;
    if (typeof doctorRef === 'object' && doctorRef._id) return doctorRef._id;
    return doctorRef;
};

const resolveAppointmentDoctorName = async (appointment) => {
    if (!appointment) return appointment;

    const populatedName = appointment?.doctorId?.name;
    if (populatedName) {
        appointment.doctorName = populatedName;
        return appointment;
    }

    if (appointment.doctorName) {
        return appointment;
    }

    let doctorId = getDoctorIdValue(appointment.doctorId);

    if (!doctorId && appointment._id) {
        const sourceAppointment = await Appointment.findById(appointment._id)
            .select('doctorId doctorName')
            .lean();

        if (sourceAppointment?.doctorName) {
            appointment.doctorName = sourceAppointment.doctorName;
            return appointment;
        }

        doctorId = getDoctorIdValue(sourceAppointment?.doctorId);
    }

    if (!doctorId) {
        return appointment;
    }

    let doctorName = null;

    const doctor = await Doctor.findById(doctorId).select('name');
    if (doctor?.name) {
        doctorName = doctor.name;
    } else {
        const legacyDoctor = await Patient.findById(doctorId).select('name role');
        if (legacyDoctor?.name) {
            doctorName = legacyDoctor.name;
        }
    }

    if (doctorName) {
        appointment.doctorName = doctorName;
        if (typeof appointment.save === 'function') {
            await appointment.save();
        }
    }

    return appointment;
};

const resolveAppointmentsDoctorNames = async (appointments = []) => {
    await Promise.all(appointments.map((appointment) => resolveAppointmentDoctorName(appointment)));
    return appointments;
};

const recalculateQueueForAppointment = async (appointmentId, io) => {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        return null;
    }

    const queuedBookings = await Booking.find({
        appointmentId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    }).sort({ tokenNumber: 1, createdAt: 1 });

    const now = new Date();
    const duration = appointment.consultationDurationMinutes || 10;

    if (queuedBookings.length > 0) {
        const bulkOps = queuedBookings.map((booking, index) => ({
            updateOne: {
                filter: { _id: booking._id },
                update: {
                    estimatedWaitMinutes: index * duration,
                    estimatedTurnTime: new Date(now.getTime() + index * duration * 60000),
                },
            },
        }));

        await Booking.bulkWrite(bulkOps);
    }

    appointment.currentTokenNumber = queuedBookings[0]?.tokenNumber ?? null;
    await appointment.save();

    const refreshedQueue = await Booking.find({
        appointmentId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    })
        .select('tokenNumber patientName status estimatedTurnTime estimatedWaitMinutes isOfflineEntry')
        .sort({ tokenNumber: 1, createdAt: 1 });

    const payload = {
        appointmentId: appointment._id,
        currentTokenNumber: appointment.currentTokenNumber,
        consultationDurationMinutes: appointment.consultationDurationMinutes,
        queue: refreshedQueue,
    };

    if (io) {
        io.to(`appointment-${appointment._id}`).emit('queue-updated', payload);
        io.to(`doctor-${appointment.doctorId}`).emit('queue-updated', payload);
    }

    return payload;
};

// ========== DOCTOR SERVICES ==========

// Create a new appointment session
const createAppointment = async (doctorId, appointmentData, creatorName) => {
    const {  
        title,
        specialization,
        appointmentDate,
        consultationDurationMinutes,
        scheduleStartTime,
        price,
        address
    } = appointmentData;

    if (!consultationDurationMinutes) {
        throw new AppError('Consultation duration is required', 400);
    }

    const doctor = await Doctor.findById(doctorId).select('name');
    const fallbackDoctor = !doctor?.name ? await Patient.findById(doctorId).select('name role') : null;
    const resolvedDoctorName = doctor?.name || fallbackDoctor?.name || creatorName || null;

    const appointment = await Appointment.create({
        doctorId,
        doctorName: resolvedDoctorName,
        title,
        specialization,
        appointmentDate,
        consultationDurationMinutes: Number(consultationDurationMinutes),
        scheduleStartTime: scheduleStartTime || '09:00',
        price,
        address,
        totalTokensIssued: 0,
        currentTokenNumber: null,
    });

    return appointment;
};

// Get doctor's appointments (for doctor dashboard)
const getDoctorAppointments = async (doctorId, date) => {
    const query = { doctorId };
    
    if (date) {
        query.appointmentDate = asDayRange(date);
    }

    // If no date filter, sort by latest first. If date filter, sort by date ascending
    const sortOrder = date ? { appointmentDate: 1, createdAt: -1 } : { appointmentDate: -1, createdAt: -1 };

    return Appointment.find(query).sort(sortOrder);
};

// Get appointment details with patient bookings
const getAppointmentDetails = async (appointmentId, doctorId) => {
    const appointment = await Appointment.findOne({ 
        _id: appointmentId,
        doctorId 
    });

    if (!appointment) {
        throw new Error('Appointment not found');
    }

    await recalculateQueueForAppointment(appointmentId);

    const refreshedAppointment = await Appointment.findOne({ 
        _id: appointmentId,
        doctorId 
    });

    const bookings = await Booking.find({ appointmentId })
        .populate('patientId', 'name email phone')
        .sort({ tokenNumber: 1, createdAt: 1 });

    return {
        appointment: refreshedAppointment,
        bookings
    };
};

// Mark patient attendance/completion
const markPatient = async (bookingId, doctorId, markStatus, treatmentData = {}, io) => {
    const booking = await Booking.findById(bookingId).populate('appointmentId');
    
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (booking.appointmentId.doctorId.toString() !== doctorId.toString()) {
        throw new AppError('Unauthorized', 403);
    }

    booking.markedBy = markStatus;
    if (markStatus === 'completed') {
        const prescription = typeof treatmentData.prescription === 'string'
            ? treatmentData.prescription.trim()
            : '';
        const medicines = Array.isArray(treatmentData.medicines)
            ? treatmentData.medicines
                .map((item) => String(item || '').trim())
                .filter(Boolean)
            : [];

        if (!prescription && medicines.length === 0) {
            throw new AppError('Add prescription notes or at least one medicine before marking done', 400);
        }

        booking.status = 'completed';
        booking.estimatedTurnTime = null;
        booking.estimatedWaitMinutes = null;
        booking.doctorPrescription = prescription;
        booking.prescribedMedicines = medicines;
    }

    if (markStatus === 'absent') {
        booking.status = 'cancelled';
        booking.estimatedTurnTime = null;
        booking.estimatedWaitMinutes = null;
    }
    
    await booking.save();

    if (io) {
        io.to(`appointment-${booking.appointmentId._id}`).emit('booking-status-updated', {
            appointmentId: booking.appointmentId._id.toString(),
            bookingId: booking._id.toString(),
            tokenNumber: booking.tokenNumber,
            status: booking.status,
            markedBy: booking.markedBy,
            doctorPrescription: booking.doctorPrescription,
            prescribedMedicines: booking.prescribedMedicines,
        });
    }

    await recalculateQueueForAppointment(booking.appointmentId._id, io);
    return booking;
};

const addOfflinePatientToQueue = async (appointmentId, doctorId, data, io) => {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    if (appointment.doctorId.toString() !== doctorId.toString()) {
        throw new AppError('Unauthorized', 403);
    }

    const lastBooking = await Booking.findOne({ appointmentId }).sort({ tokenNumber: -1 });
    const tokenNumber = (lastBooking?.tokenNumber || 0) + 1;

    const booking = await Booking.create({
        appointmentId,
        patientId: null,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
        description: data.description,
        tokenNumber,
        isOfflineEntry: true,
    });

    appointment.totalTokensIssued = Math.max(appointment.totalTokensIssued || 0, tokenNumber);
    await appointment.save();

    await recalculateQueueForAppointment(appointmentId, io);

    return booking;
};

// ========== PATIENT SERVICES ==========

// Get all appointments (for patient to browse)
const getAllAppointments = async (filters = {}) => {
    const query = { status: 'active' };
    
    // Filter by specialization
    if (filters.specialization) {
        query.specialization = filters.specialization;
    }

    // Filter by date range
    if (filters.fromDate) {
        query.appointmentDate = { $gte: new Date(filters.fromDate) };
    }

    if (filters.date) {
        query.appointmentDate = asDayRange(filters.date);
    }

    const appointments = await Appointment.find(query)
        .populate('doctorId', 'name email')
        .sort({ appointmentDate: 1 });

    await resolveAppointmentsDoctorNames(appointments);
    return appointments;
};

// Get appointment queue details
const getAppointmentWithSlots = async (appointmentId) => {
    const appointment = await Appointment.findById(appointmentId)
        .populate('doctorId', 'name email phone');

    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    await recalculateQueueForAppointment(appointmentId);

    const refreshedAppointment = await Appointment.findById(appointmentId)
        .populate('doctorId', 'name email phone');

    await resolveAppointmentDoctorName(refreshedAppointment);

    const queue = await Booking.find({
        appointmentId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    })
        .select('tokenNumber patientName status estimatedTurnTime estimatedWaitMinutes isOfflineEntry')
        .sort({ tokenNumber: 1, createdAt: 1 });

    return {
        ...refreshedAppointment.toObject(),
        queue,
    };
};

// Book into appointment queue
const bookSlot = async (patientId, bookingData, io) => {
    const {
        appointmentId,
        patientName,
        patientPhone,
        patientAge,
        patientGender,
        description
    } = bookingData;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    if (appointment.status !== 'active') {
        throw new AppError('Appointment is not active', 400);
    }

    const existing = await Booking.findOne({
        appointmentId,
        patientId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    });

    if (existing) {
        throw new AppError('You already have an active token for this appointment', 400);
    }

    const lastBooking = await Booking.findOne({ appointmentId }).sort({ tokenNumber: -1 });
    const tokenNumber = (lastBooking?.tokenNumber || 0) + 1;

    // Create booking
    const booking = await Booking.create({
        appointmentId,
        patientId,
        tokenNumber,
        patientName,
        patientPhone,
        patientAge,
        patientGender,
        description,
        isOfflineEntry: false,
    });

    appointment.totalTokensIssued = Math.max(appointment.totalTokensIssued || 0, tokenNumber);
    await appointment.save();

    const queueState = await recalculateQueueForAppointment(appointmentId, io);

    // Emit real-time update
    if (io) {
        io.to(`doctor-${appointment.doctorId}`).emit('new-booking', {
            appointmentId,
            booking
        });
    }

    return {
        ...booking.toObject(),
        currentTokenNumber: queueState?.currentTokenNumber ?? null,
    };
};

// Get patient's bookings
const getPatientBookings = async (patientId) => {
    const bookings = await Booking.find({ patientId })
        .populate({
            path: 'appointmentId',
            populate: { path: 'doctorId', select: 'name email' }
        })
        .sort({ createdAt: -1 });

    await Promise.all(
        bookings
            .filter((booking) => booking.appointmentId)
            .map((booking) => resolveAppointmentDoctorName(booking.appointmentId))
    );

    return bookings;
};

// Cancel booking
const cancelBooking = async (bookingId, patientId, io) => {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (!booking.patientId || booking.patientId.toString() !== patientId.toString()) {
        throw new AppError('Unauthorized', 403);
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.markedBy = 'absent';
    booking.estimatedTurnTime = null;
    booking.estimatedWaitMinutes = null;
    await booking.save();

    const appointment = await Appointment.findById(booking.appointmentId);
    if (!appointment) {
        return booking;
    }

    await recalculateQueueForAppointment(booking.appointmentId, io);

    // Emit real-time update
    if (io) {
        io.to(`doctor-${appointment.doctorId}`).emit('booking-cancelled', {
            appointmentId: booking.appointmentId,
            bookingId
        });
    }

    return booking;
};

// ========== DELETE SERVICES (For clearing data) ==========

// Delete all appointments
const deleteAllAppointments = async () => {
    const result = await Appointment.deleteMany({});
    return { deletedCount: result.deletedCount };
};

// Delete all bookings
const deleteAllBookings = async () => {
    const result = await Booking.deleteMany({});
    return { deletedCount: result.deletedCount };
};

// Delete specific appointment by ID
const deleteAppointmentById = async (appointmentId) => {
    const appointment = await Appointment.findByIdAndDelete(appointmentId);
    if (!appointment) {
        throw new Error('Appointment not found');
    }
    // Also delete associated bookings
    await Booking.deleteMany({ appointmentId });
    return appointment;
};

// Delete all queue data (appointments + bookings)
const clearAllQueueData = async () => {
    const appointments = await Appointment.deleteMany({});
    const bookings = await Booking.deleteMany({});
    return {
        appointmentsDeleted: appointments.deletedCount,
        bookingsDeleted: bookings.deletedCount
    };
};

module.exports = {
    // Doctor services
    createAppointment,
    getDoctorAppointments,
    getAppointmentDetails,
    markPatient,
    addOfflinePatientToQueue,
    
    // Patient services
    getAllAppointments,
    getAppointmentWithSlots,
    bookSlot,
    getPatientBookings,
    cancelBooking,
    
    // Delete services
    deleteAllAppointments,
    deleteAllBookings,
    deleteAppointmentById,
    clearAllQueueData,
    recalculateQueueForAppointment,
};
