const asyncHandler = require('../../shared/utils/asyncHandler');
const recordService = require('./record.service');
const { sendSuccess } = require('../../shared/utils/response');

const createRecord = asyncHandler(async (req, res) => {
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const record = await recordService.createRecord(req.user._id, req.body, fileUrl);
    sendSuccess(res, record, 'Health record created', 201);
});

const getRecords = asyncHandler(async (req, res) => {
    const records = await recordService.getRecords(req.user._id);
    sendSuccess(res, records, 'Records fetched');
});

const getRecord = asyncHandler(async (req, res) => {
    const record = await recordService.getRecordById(req.params.id, req.user._id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    sendSuccess(res, record, 'Record fetched');
});

const deleteRecord = asyncHandler(async (req, res) => {
    await recordService.deleteRecord(req.params.id, req.user._id);
    sendSuccess(res, null, 'Record deleted');
});

module.exports = { createRecord, getRecords, getRecord, deleteRecord };
