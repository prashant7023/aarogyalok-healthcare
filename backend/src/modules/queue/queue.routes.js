const { Router } = require('express');
const { issueToken, getQueueStatus, callNext, getMyToken } = require('./queue.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');

const router = Router();

router.post('/token', protect, issueToken);
router.get('/status/:hospitalId', getQueueStatus);              // Public
router.patch('/next', protect, restrict('doctor', 'admin'), callNext);
router.get('/my-token', protect, getMyToken);

module.exports = router;
