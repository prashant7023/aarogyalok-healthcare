const { Router } = require('express');
const { issueToken, getQueueStatus, callNext, getMyToken } = require('./queue.controller');
const appointmentController = require('./appointment.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');

const router = Router();

// ===== Original Queue Routes (Hospital Token System) =====
router.post('/token', protect, restrict('patient'), issueToken);
router.get('/my-token', protect, restrict('patient'), getMyToken);
router.get('/status/:hospitalId', getQueueStatus);
router.patch('/next', protect, restrict('doctor', 'hospital', 'admin'), callNext);

// ===== DOCTOR ROUTES =====
// Create appointment session
router.post('/appointments', protect, restrict('doctor'), appointmentController.createAppointment);

// Get doctor's appointments (dashboard)
router.get('/doctor/appointments', protect, restrict('doctor'), appointmentController.getDoctorAppointments);

// Get appointment details with patient list
router.get('/doctor/appointments/:appointmentId', protect, restrict('doctor'), appointmentController.getAppointmentDetails);

// Mark patient (present/absent/completed)
router.patch('/doctor/bookings/:bookingId/mark', protect, restrict('doctor'), appointmentController.markPatient);

// ===== PATIENT ROUTES =====
// Browse all appointments
router.get('/appointments', appointmentController.getAllAppointments);

// Get specific appointment with slots
router.get('/appointments/:appointmentId', appointmentController.getAppointmentWithSlots);

// Book a slot
router.post('/bookings', protect, restrict('patient'), appointmentController.bookSlot);

// Get my bookings
router.get('/my-bookings', protect, restrict('patient'), appointmentController.getPatientBookings);

// Cancel booking
router.delete('/bookings/:bookingId', protect, restrict('patient'), appointmentController.cancelBooking);

// ===== DELETE ROUTES (For clearing data) =====
// Delete all appointments
router.delete('/admin/appointments/all', protect, restrict('doctor', 'admin'), appointmentController.deleteAllAppointments);

// Delete all bookings
router.delete('/admin/bookings/all', protect, restrict('doctor', 'admin'), appointmentController.deleteAllBookings);

// Delete specific appointment by ID
router.delete('/admin/appointments/:appointmentId', protect, restrict('doctor', 'admin'), appointmentController.deleteAppointmentById);

// Clear all queue data (appointments + bookings)
router.delete('/admin/clear-all', protect, restrict('doctor', 'admin'), appointmentController.clearAllQueueData);

module.exports = router;
