const { Router } = require('express');
const { issueToken, getQueueStatus, callNext, getMyToken } = require('./queue.controller');
const appointmentController = require('./appointment.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname);
		cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const valid = /pdf|jpg|jpeg|png/.test(path.extname(file.originalname).toLowerCase());
		cb(null, valid);
	},
});

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
router.get('/doctor/bookings', protect, appointmentController.getDoctorBookings);

// Doctor CRM - consulted patients list
router.get('/doctor/consulted-patients', protect, restrict('doctor'), appointmentController.getDoctorConsultedPatients);

// Doctor CRM - consulted patient full details
router.get('/doctor/patients/:patientId', protect, restrict('doctor'), appointmentController.getDoctorPatientDetails);

// Get appointment details with patient list
router.get('/doctor/appointments/:appointmentId', protect, appointmentController.getAppointmentDetails);

// Mark patient (present/absent/completed)
router.patch('/doctor/bookings/:bookingId/mark', protect, upload.single('prescriptionFile'), appointmentController.markPatient);

// Doctor can add walk-in/offline patient directly to queue
router.post('/doctor/appointments/:appointmentId/offline-bookings', protect, appointmentController.addOfflinePatientToQueue);

// ===== PATIENT ROUTES =====
// Browse all appointments
router.get('/appointments', appointmentController.getAllAppointments);

// Browse nearby appointments by map location
router.get('/appointments/nearby', appointmentController.getNearbyAppointments);

// Get specific appointment with queue summary
router.get('/appointments/:appointmentId', appointmentController.getAppointmentWithSlots);

// Book a queue token
router.post('/bookings', protect, appointmentController.bookSlot);

// Get my bookings
router.get('/my-bookings', protect, appointmentController.getPatientBookings);

// Submit or update my review for a completed booking
router.patch('/bookings/:bookingId/review', protect, appointmentController.submitBookingReview);

// Cancel booking
router.delete('/bookings/:bookingId', protect, appointmentController.cancelBooking);

// ===== DELETE ROUTES (For clearing data) =====
router.delete('/admin/appointments/all', protect, appointmentController.deleteAllAppointments);
router.delete('/admin/bookings/all', protect, appointmentController.deleteAllBookings);
router.delete('/admin/appointments/:appointmentId', protect, appointmentController.deleteAppointmentById);
router.delete('/admin/clear-all', protect, appointmentController.clearAllQueueData);

module.exports = router;
