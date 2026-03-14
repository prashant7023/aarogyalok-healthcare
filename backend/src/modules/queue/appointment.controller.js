const asyncHandler = require('../../shared/utils/asyncHandler');
const appointmentService = require('./appointment.service');
const { sendSuccess } = require('../../shared/utils/response');

// ========== DOCTOR CONTROLLERS ==========

// Create appointment session
const createAppointment = asyncHandler(async (req, res) => {
    const appointment = await appointmentService.createAppointment(
        req.user._id,
        req.body,
        req.user?.name
    );
    sendSuccess(res, appointment, 'Appointment created successfully', 201);
});

// Get doctor's appointments
const getDoctorAppointments = asyncHandler(async (req, res) => {
    const date = req.query.date; // Allow undefined to show all appointments
    const appointments = await appointmentService.getDoctorAppointments(
        req.user._id,
        date
    );
    sendSuccess(res, appointments, 'Appointments fetched successfully');
});

const getDoctorConsultedPatients = asyncHandler(async (req, res) => {
    const data = await appointmentService.getDoctorConsultedPatients(req.user._id, {
        search: req.query.search,
    });
    sendSuccess(res, data, 'Consulted patients fetched successfully');
});

const getDoctorPatientDetails = asyncHandler(async (req, res) => {
    const data = await appointmentService.getDoctorPatientDetails(req.user._id, req.params.patientId);
    sendSuccess(res, data, 'Doctor patient details fetched successfully');
});

// Get appointment details with patient bookings
const getAppointmentDetails = asyncHandler(async (req, res) => {
    const data = await appointmentService.getAppointmentDetails(
        req.params.appointmentId,
        req.user._id
    );
    sendSuccess(res, data, 'Appointment details fetched successfully');
});

// Mark patient (present/absent/completed)
const markPatient = asyncHandler(async (req, res) => {
    const { markStatus, prescription, medicines } = req.body;
    const io = req.app.get('io');
    const booking = await appointmentService.markPatient(
        req.params.bookingId,
        req.user._id,
        markStatus,
        {
            prescription,
            medicines,
        },
        io
    );
    sendSuccess(res, booking, 'Patient marked successfully');
});

const addOfflinePatientToQueue = asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const booking = await appointmentService.addOfflinePatientToQueue(
        req.params.appointmentId,
        req.user._id,
        req.body,
        io
    );
    sendSuccess(res, booking, 'Offline patient added to queue successfully', 201);
});

// ========== PATIENT CONTROLLERS ==========

// Get all appointments (for browsing)
const getAllAppointments = asyncHandler(async (req, res) => {
    const filters = {
        doctorId: req.query.doctorId,
        doctorSearch: req.query.doctorSearch,
        specialization: req.query.specialization,
        fromDate: req.query.fromDate,
        date: req.query.date,
    };
    const appointments = await appointmentService.getAllAppointments(filters);
    sendSuccess(res, appointments, 'Appointments fetched successfully');
});

const getNearbyAppointments = asyncHandler(async (req, res) => {
    const filters = {
        doctorSearch: req.query.doctorSearch,
        specialization: req.query.specialization,
        fromDate: req.query.fromDate,
        date: req.query.date,
        latitude: req.query.latitude,
        longitude: req.query.longitude,
        distanceKm: req.query.distanceKm,
    };

    const appointments = await appointmentService.getNearbyAppointments(filters);
    sendSuccess(res, appointments, 'Nearby appointments fetched successfully');
});

// Get appointment with slots
const getAppointmentWithSlots = asyncHandler(async (req, res) => {
    const appointment = await appointmentService.getAppointmentWithSlots(
        req.params.appointmentId
    );
    sendSuccess(res, appointment, 'Appointment fetched successfully');
});

// Book a slot
const bookSlot = asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const booking = await appointmentService.bookSlot(
        req.user._id,
        req.body,
        io
    );
    sendSuccess(res, booking, 'Token booked successfully', 201);
});

// Get patient's bookings
const getPatientBookings = asyncHandler(async (req, res) => {
    const bookings = await appointmentService.getPatientBookings(req.user._id);
    sendSuccess(res, bookings, 'Bookings fetched successfully');
});

// Cancel booking
const cancelBooking = asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const booking = await appointmentService.cancelBooking(
        req.params.bookingId,
        req.user._id,
        io
    );
    sendSuccess(res, booking, 'Booking cancelled successfully');
});

const submitBookingReview = asyncHandler(async (req, res) => {
    const booking = await appointmentService.submitBookingReview(
        req.params.bookingId,
        req.user._id,
        req.body
    );
    sendSuccess(res, booking, 'Review submitted successfully');
});

// ========== DELETE CONTROLLERS (For clearing data) ==========

// Delete all appointments
const deleteAllAppointments = asyncHandler(async (req, res) => {
    const result = await appointmentService.deleteAllAppointments();
    sendSuccess(res, result, `Deleted ${result.deletedCount} appointments`);
});

// Delete all bookings
const deleteAllBookings = asyncHandler(async (req, res) => {
    const result = await appointmentService.deleteAllBookings();
    sendSuccess(res, result, `Deleted ${result.deletedCount} bookings`);
});

// Delete specific appointment by ID
const deleteAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await appointmentService.deleteAppointmentById(req.params.appointmentId);
    sendSuccess(res, appointment, 'Appointment deleted successfully');
});

// Clear all queue data
const clearAllQueueData = asyncHandler(async (req, res) => {
    const result = await appointmentService.clearAllQueueData();
    sendSuccess(res, result, 'All queue data cleared successfully');
});

module.exports = {
    // Doctor
    createAppointment,
    getDoctorAppointments,
    getDoctorConsultedPatients,
    getDoctorPatientDetails,
    getAppointmentDetails,
    markPatient,
    addOfflinePatientToQueue,
    
    // Patient
    getAllAppointments,
    getNearbyAppointments,
    getAppointmentWithSlots,
    bookSlot,
    getPatientBookings,
    submitBookingReview,
    cancelBooking,
    
    // Delete
    deleteAllAppointments,
    deleteAllBookings,
    deleteAppointmentById,
    clearAllQueueData
};
