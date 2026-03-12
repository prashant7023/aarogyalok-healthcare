const Doctor = require('../auth/doctor.model');
const Booking = require('./booking.model');

// Get all doctors (for patient to browse)
const getAllDoctors = async (filters = {}) => {
    const query = { isActive: true };
    
    if (filters.specialization) {
        query.specialization = filters.specialization;
    }
    
    return Doctor.find(query)
        .select('-password')
        .sort({ rating: -1, createdAt: -1 });
};

// Get doctor by ID with slots for a date
const getDoctorWithSlots = async (doctorId, date) => {
    const doctor = await Doctor.findById(doctorId).select('-password');
    if (!doctor) {
        throw new Error('Doctor not found');
    }
    
    // Generate slots for the requested date
    const allSlots = doctor.generateTimeSlots(date);
    
    // Get existing bookings for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookings = await Booking.find({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed'] }
    });
    
    // Mark booked slots as unavailable
    const bookedTimes = bookings.map(b => b.timeSlot);
    const availableSlots = allSlots.map(slot => ({
        ...slot,
        available: !bookedTimes.includes(slot.time)
    }));
    
    return {
        doctor,
        slots: availableSlots,
        totalSlots: allSlots.length,
        availableCount: availableSlots.filter(s => s.available).length
    };
};

// Book an appointment
const bookAppointment = async (bookingData, io) => {
    const { 
        doctorId, 
        patientId, 
        appointmentDate, 
        timeSlot, 
        patientName, 
        patientAge,
        patientGender,
        patientPhone, 
        diseaseDescription 
    } = bookingData;
    
    // Check if slot is still available
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingBooking = await Booking.findOne({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        timeSlot,
        status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingBooking) {
        throw new Error('This slot is already booked');
    }
    
    // Generate token number for the day
    const bookingsToday = await Booking.countDocuments({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const booking = await Booking.create({
        doctorId,
        patientId,
        patientName,
        patientAge,
        patientGender,
        patientPhone,
        diseaseDescription,
        appointmentDate,
        timeSlot,
        tokenNumber: bookingsToday + 1,
        status: 'confirmed'
    });
    
    // Emit real-time update via Socket.IO
    if (io) {
        io.to(`doctor-${doctorId}`).emit('new-booking', {
            doctorId,
            booking: await booking.populate('patientId', 'name email')
        });
    }
    
    return booking;
};

// Get doctor's appointments for a date
const getDoctorAppointments = async (doctorId, date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Booking.find({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('patientId', 'name email phone')
    .sort({ timeSlot: 1 });
};

// Get patient's bookings
const getPatientBookings = async (patientId) => {
    return Booking.find({ patientId })
        .populate('doctorId', 'name specialization clinicAddress consultationFee')
        .sort({ appointmentDate: -1 });
};

// Cancel booking
const cancelBooking = async (bookingId, userId, io) => {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
        throw new Error('Booking not found');
    }
    
    if (booking.patientId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
    }
    
    booking.status = 'cancelled';
    await booking.save();
    
    // Emit real-time update
    if (io) {
        io.to(`doctor-${booking.doctorId}`).emit('booking-cancelled', {
            bookingId,
            doctorId: booking.doctorId
        });
    }
    
    return booking;
};

module.exports = {
    getAllDoctors,
    getDoctorWithSlots,
    bookAppointment,
    getDoctorAppointments,
    getPatientBookings,
    cancelBooking
};
