const asyncHandler = require('../../../shared/utils/asyncHandler');
const medicationService = require('../services/medication.service');
const { sendSuccess } = require('../../../shared/utils/response');

/* ---- CRUD -------------------------------------------------------- */

const createMedication = asyncHandler(async (req, res) => {
    const med = await medicationService.createMedication(req.user._id, req.body);
    sendSuccess(res, med, 'Medication created', 201);
});

const getMedications = asyncHandler(async (req, res) => {
    const meds = await medicationService.getMedications(req.user._id);
    sendSuccess(res, meds, 'Medications fetched');
});

const getMedication = asyncHandler(async (req, res) => {
    const med = await medicationService.getMedicationById(req.params.id, req.user._id);
    if (!med) return res.status(404).json({ success: false, message: 'Not found' });
    sendSuccess(res, med, 'Medication fetched');
});

const updateMedication = asyncHandler(async (req, res) => {
    const med = await medicationService.updateMedication(req.params.id, req.user._id, req.body);
    if (!med) return res.status(404).json({ success: false, message: 'Not found' });
    sendSuccess(res, med, 'Medication updated');
});

const deleteMedication = asyncHandler(async (req, res) => {
    await medicationService.deleteMedication(req.params.id, req.user._id);
    sendSuccess(res, null, 'Medication deactivated');
});

/* ---- Reminders --------------------------------------------------- */

const getTodayReminders = asyncHandler(async (req, res) => {
    const reminders = await medicationService.getTodayReminders(req.user._id);
    sendSuccess(res, reminders, "Today's reminders");
});

const respondToReminder = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'taken' or 'skipped'
    const log = await medicationService.respondToReminder(req.params.id, req.user._id, status);
    if (!log) {
        return res.status(404).json({
            success: false,
            message: 'Reminder not found or already responded',
        });
    }
    sendSuccess(res, log, `Reminder marked as ${status}`);
});

const getAdherenceStats = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 7;
    const stats = await medicationService.getAdherenceStats(req.user._id, days);
    sendSuccess(res, stats, 'Adherence stats');
});

const getDoctorMedicationSummary = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const summary = await medicationService.getDoctorMedicationSummary(req.user._id, days);
    sendSuccess(res, summary, 'Doctor medication summary');
});

module.exports = {
    createMedication,
    getMedications,
    getMedication,
    updateMedication,
    deleteMedication,
    getTodayReminders,
    respondToReminder,
    getAdherenceStats,
    getDoctorMedicationSummary,
};
