const asyncHandler = require('../../shared/utils/asyncHandler');
const queueService = require('./queue.service');
const { sendSuccess } = require('../../shared/utils/response');

const issueToken = asyncHandler(async (req, res) => {
    const { hospitalId } = req.body;
    const io = req.app.get('io');
    const token = await queueService.issueToken(req.user._id, hospitalId, io);
    sendSuccess(res, token, 'Queue token issued', 201);
});

const getQueueStatus = asyncHandler(async (req, res) => {
    const queue = await queueService.getQueueStatus(req.params.hospitalId);
    sendSuccess(res, queue, 'Queue status fetched');
});

const callNext = asyncHandler(async (req, res) => {
    const { hospitalId } = req.body;
    const io = req.app.get('io');
    const next = await queueService.callNextToken(hospitalId, io);
    sendSuccess(res, next, next ? 'Next token called' : 'Queue is empty');
});

const getMyToken = asyncHandler(async (req, res) => {
    const token = await queueService.getMyToken(req.user._id);
    sendSuccess(res, token, 'Your token');
});

module.exports = { issueToken, getQueueStatus, callNext, getMyToken };
