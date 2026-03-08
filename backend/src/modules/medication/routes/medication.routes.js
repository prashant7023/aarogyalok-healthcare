const { Router } = require('express');
const {
    createMedication,
    getMedications,
    getMedication,
    updateMedication,
    deleteMedication,
    getTodayReminders,
    respondToReminder,
    getAdherenceStats,
} = require('../controllers/medication.controller');
const { protect, restrict } = require('../../../shared/middleware/auth.middleware');

const router = Router();

// All medication routes: protected + patient only
router.use(protect, restrict('patient'));

// ---- Reminder routes (declared BEFORE /:id to avoid conflicts) ----
router.get('/reminders/today', getTodayReminders);
router.patch('/reminders/:id/respond', respondToReminder);
router.get('/adherence', getAdherenceStats);

// ---- CRUD routes ----
router.route('/').post(createMedication).get(getMedications);
router.route('/:id').get(getMedication).put(updateMedication).delete(deleteMedication);

module.exports = router;
