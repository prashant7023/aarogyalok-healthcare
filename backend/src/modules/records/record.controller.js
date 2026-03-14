const asyncHandler = require('../../shared/utils/asyncHandler');
const recordService = require('./record.service');
const { sendSuccess } = require('../../shared/utils/response');

const PRIVILEGED_ROLES = ['doctor', 'hospital', 'admin'];
const isPrivileged = (role) => PRIVILEGED_ROLES.includes(role);

const createRecord = asyncHandler(async (req, res) => {
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const fileType = req.file?.mimetype
        ? req.file.mimetype.split('/')[1]?.toLowerCase()
        : undefined;
    // Doctors uploading on behalf of a patient can pass patientId in the body
    const userId =
        isPrivileged(req.user.role) && req.body.patientId
            ? req.body.patientId
            : req.user._id;
    const payload = {
        ...req.body,
        fileType,
    };

    const record = await recordService.createRecord(userId, payload, fileUrl, req.file);
    sendSuccess(res, record, 'Health record created', 201);
});

const getRecords = asyncHandler(async (req, res) => {
    const records = isPrivileged(req.user.role)
        ? await recordService.getAllRecords()
        : await recordService.getRecords(req.user._id);
    sendSuccess(res, records, 'Records fetched');
});

const getRecord = asyncHandler(async (req, res) => {
    const record = await recordService.getRecordById(
        req.params.id,
        req.user._id,
        isPrivileged(req.user.role)
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    sendSuccess(res, record, 'Record fetched');
});

const deleteRecord = asyncHandler(async (req, res) => {
    const deleted = await recordService.deleteRecord(
        req.params.id,
        req.user._id,
        isPrivileged(req.user.role)
    );
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found' });
    sendSuccess(res, null, 'Record deleted');
});

module.exports = { createRecord, getRecords, getRecord, deleteRecord };
