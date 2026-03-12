const asyncHandler = require('../../shared/utils/asyncHandler');
const doctorService = require('./doctor.service');
const { sendSuccess } = require('../../shared/utils/response');

// Get all doctors (for patients)
const getAllDoctors = asyncHandler(async (req, res) => {
    const filters = {
        specialization: req.query.specialization
    };
    
    const doctors = await doctorService.getAllDoctors(filters);
    sendSuccess(res, doctors, 'Doctors fetched successfully');
});

// Get doctor with available slots
const getDoctorWithSlots = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const data = await doctorService.getDoctorWithSlots(doctorId, date);
    sendSuccess(res, data, 'Doctor slots fetched successfully');
});

// Book an appointment
const bookAppointment = asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    
    const bookingData = {
        ...req.body,
        patientId: req.user._id
    };
    
    const booking = await doctorService.bookAppointment(bookingData, io);
    sendSuccess(res, booking, 'Appointment booked successfully', 201);
});

// Get doctor's appointments
const getDoctorAppointments = asyncHandler(async (req, res) => {
    const doctorId = req.user._id; // Assuming doctor is logged in
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const appointments = await doctorService.getDoctorAppointments(doctorId, date);
    sendSuccess(res, appointments, 'Appointments fetched successfully');
});

// Get patient's bookings
const getPatientBookings = asyncHandler(async (req, res) => {
    const bookings = await doctorService.getPatientBookings(req.user._id);
    sendSuccess(res, bookings, 'Bookings fetched successfully');
});

// Cancel booking
const cancelBooking = asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const booking = await doctorService.cancelBooking(req.params.bookingId, req.user._id, io);
    sendSuccess(res, booking, 'Booking cancelled successfully');
});

module.exports = {
    getAllDoctors,
    getDoctorWithSlots,
    bookAppointment,
    getDoctorAppointments,
    getPatientBookings,
    cancelBooking
};
