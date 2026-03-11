const Appointment = require('./appointment.model');
const Booking = require('./booking.model');

// ========== DOCTOR SERVICES ==========

// Create a new appointment session
const createAppointment = async (doctorId, appointmentData) => {
    const {  
        title,
        specialization,
        appointmentDate,
        timeSlots, // Array of time strings like ["10:00 AM", "10:30 AM", ...]
        price,
        address
    } = appointmentData;

    // Convert time slots to proper format
    const formattedSlots = timeSlots.map(time => ({
        time,
        isBooked: false
    }));

    const appointment = await Appointment.create({
        doctorId,
        title,
        specialization,
        appointmentDate,
        timeSlots: formattedSlots,
        price,
        address,
        totalSlots: formattedSlots.length,
        bookedSlots: 0
    });

    return appointment;
};

// Get doctor's appointments (for doctor dashboard)
const getDoctorAppointments = async (doctorId, date) => {
    const query = { doctorId };
    
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
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

    const bookings = await Booking.find({ appointmentId })
        .populate('patientId', 'name email phone')
        .sort({ timeSlot: 1 });

    return {
        appointment,
        bookings
    };
};

// Mark patient attendance/completion
const markPatient = async (bookingId, doctorId, markStatus) => {
    const booking = await Booking.findById(bookingId).populate('appointmentId');
    
    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.appointmentId.doctorId.toString() !== doctorId.toString()) {
        throw new Error('Unauthorized');
    }

    booking.markedBy = markStatus;
    if (markStatus === 'completed') {
        booking.status = 'completed';
    }
    
    await booking.save();
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

    return Appointment.find(query)
        .populate('doctorId', 'name email')
        .sort({ appointmentDate: 1 });
};

// Get appointment with available slots
const getAppointmentWithSlots = async (appointmentId) => {
    const appointment = await Appointment.findById(appointmentId)
        .populate('doctorId', 'name email phone');

    if (!appointment) {
        throw new Error('Appointment not found');
    }

    return appointment;
};

// Book a slot in an appointment
const bookSlot = async (patientId, bookingData, io) => {
    const {
        appointmentId,
        timeSlot,
        patientName,
        patientAge,
        patientGender,
        description
    } = bookingData;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
        throw new Error('Appointment not found');
    }

    // Check if slot exists and is available
    const slot = appointment.timeSlots.find(s => s.time === timeSlot);
    
    if (!slot) {
        throw new Error('Time slot not found');
    }

    if (slot.isBooked) {
        throw new Error('This slot is already booked');
    }

    // Create booking
    const booking = await Booking.create({
        appointmentId,
        patientId,
        timeSlot,
        patientName,
        patientAge,
        patientGender,
        description
    });

    // Mark slot as booked
    slot.isBooked = true;
    appointment.bookedSlots += 1;
    await appointment.save();

    // Emit real-time update
    if (io) {
        io.to(`doctor-${appointment.doctorId}`).emit('new-booking', {
            appointmentId,
            booking
        });
    }

    return booking;
};

// Get patient's bookings
const getPatientBookings = async (patientId) => {
    return Booking.find({ patientId })
        .populate({
            path: 'appointmentId',
            populate: { path: 'doctorId', select: 'name email' }
        })
        .sort({ createdAt: -1 });
};

// Cancel booking
const cancelBooking = async (bookingId, patientId, io) => {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.patientId.toString() !== patientId.toString()) {
        throw new Error('Unauthorized');
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    // Free up the slot
    const appointment = await Appointment.findById(booking.appointmentId);
    if (appointment) {
        const slot = appointment.timeSlots.find(s => s.time === booking.timeSlot);
        if (slot) {
            slot.isBooked = false;
            appointment.bookedSlots = Math.max(0, appointment.bookedSlots - 1);
            await appointment.save();
        }
    }

    // Emit real-time update
    if (io && appointment) {
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
    clearAllQueueData
};
