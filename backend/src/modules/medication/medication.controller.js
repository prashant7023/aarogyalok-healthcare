const asyncHandler = require('../../shared/utils/asyncHandler');
const medicationService = require('./medication.service');
const { sendSuccess } = require('../../shared/utils/response');

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

module.exports = { createMedication, getMedications, getMedication, updateMedication, deleteMedication };
