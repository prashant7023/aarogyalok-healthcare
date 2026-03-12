const { Router } = require('express');
const { issueToken, getQueueStatus, callNext, getMyToken } = require('./queue.controller');
const appointmentController = require('./appointment.controller');
const { protect } = require('../../shared/middleware/auth.middleware');

const router = Router();

// ===== Original Queue Routes (Hospital Token System) =====
router.post('/token', protect, issueToken);
router.get('/my-token', protect, getMyToken);
router.get('/status/:hospitalId', getQueueStatus);
router.patch('/next', protect, callNext);

// ===== DOCTOR ROUTES =====
// Create appointment session
router.post('/appointments', protect, appointmentController.createAppointment);

// Get doctor's appointments (dashboard)
router.get('/doctor/appointments', protect, appointmentController.getDoctorAppointments);

// Get appointment details with patient list
router.get('/doctor/appointments/:appointmentId', protect, appointmentController.getAppointmentDetails);

// Mark patient (present/absent/completed)
router.patch('/doctor/bookings/:bookingId/mark', protect, appointmentController.markPatient);

// ===== PATIENT ROUTES =====
// Browse all appointments
router.get('/appointments', appointmentController.getAllAppointments);

// Get specific appointment with slots
router.get('/appointments/:appointmentId', appointmentController.getAppointmentWithSlots);

// Book a slot
router.post('/bookings', protect, appointmentController.bookSlot);

// Get my bookings
router.get('/my-bookings', protect, appointmentController.getPatientBookings);

// Cancel booking
router.delete('/bookings/:bookingId', protect, appointmentController.cancelBooking);

// ===== DELETE ROUTES (For clearing data) =====
router.delete('/admin/appointments/all', protect, appointmentController.deleteAllAppointments);
router.delete('/admin/bookings/all', protect, appointmentController.deleteAllBookings);
router.delete('/admin/appointments/:appointmentId', protect, appointmentController.deleteAppointmentById);
router.delete('/admin/clear-all', protect, appointmentController.clearAllQueueData);

module.exports = router;
