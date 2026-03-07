const { Router } = require('express');
const { issueToken, getQueueStatus, callNext, getMyToken } = require('./queue.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');

const router = Router();

// Patient: get a token + view their own token
router.post('/token', protect, restrict('patient'), issueToken);
router.get('/my-token', protect, restrict('patient'), getMyToken);

// Public: anyone can see live queue for a hospital
router.get('/status/:hospitalId', getQueueStatus);

// Doctor / Hospital only: call the next patient
router.patch('/next', protect, restrict('doctor', 'hospital', 'admin'), callNext);

module.exports = router;
