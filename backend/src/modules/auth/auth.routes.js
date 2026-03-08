const { Router } = require('express');
const { register, login, getMe } = require('./auth.controller');
const { protect } = require('../../shared/middleware/auth.middleware');
const User = require('./auth.model');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Store FCM token for push notifications (web + mobile)
router.put('/fcm-token', protect, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required' });

        const user = await User.findById(req.user._id);
        if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            await user.save();
        }
        res.json({ message: 'FCM token saved' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Remove an FCM token (on logout / unsubscribe)
router.delete('/fcm-token', protect, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const user = await User.findById(req.user._id);
        user.fcmTokens = user.fcmTokens.filter((t) => t !== fcmToken);
        await user.save();
        res.json({ message: 'FCM token removed' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
