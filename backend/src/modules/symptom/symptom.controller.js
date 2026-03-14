const asyncHandler = require('../../shared/utils/asyncHandler');
const symptomService = require('./symptom.service');
const { sendSuccess } = require('../../shared/utils/response');

const analyzeSymptoms = asyncHandler(async (req, res) => {
    const { symptoms } = req.body;
    const io = req.app.get('io');
    const report = await symptomService.analyze(req.user._id, symptoms, { io });
    sendSuccess(res, report, 'Symptoms analyzed', 201);
});

const getHistory = asyncHandler(async (req, res) => {
    const history = await symptomService.getHistory(req.user._id);
    sendSuccess(res, history, 'History fetched');
});

const getReport = asyncHandler(async (req, res) => {
    const report = await symptomService.getById(req.params.id, req.user._id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    sendSuccess(res, report, 'Report fetched');
});

module.exports = { analyzeSymptoms, getHistory, getReport };
