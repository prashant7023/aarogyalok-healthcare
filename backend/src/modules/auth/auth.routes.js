const { Router } = require('express');
const { register, login, getMe } = require('./auth.controller');
const { protect } = require('../../shared/middleware/auth.middleware');
const Patient = require('./patient.model');
const Doctor = require('./doctor.model');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Store FCM token — atomic $addToSet prevents duplicates even under race conditions
router.put('/fcm-token', protect, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required' });

        const Model = req.user.role === 'doctor' ? Doctor : Patient;
        const updated = await Model.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { fcmTokens: fcmToken } },
            { new: true }
        );
        if (!updated) {
            console.error(`[FCM] User not found in DB: id=${req.user._id} role=${req.user.role}`);
            return res.status(404).json({ message: 'User not found — token not saved' });
        }
        console.log(`[FCM] Token stored for user ${req.user._id} (${req.user.role}) — total tokens: ${updated.fcmTokens.length}`);
        res.json({ message: 'FCM token saved', tokenCount: updated.fcmTokens.length });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Remove an FCM token (on logout / unsubscribe)
router.delete('/fcm-token', protect, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const Model = req.user.role === 'doctor' ? Doctor : Patient;
        await Model.findByIdAndUpdate(
            req.user._id,
            { $pull: { fcmTokens: fcmToken } }
        );
        res.json({ message: 'FCM token removed' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
