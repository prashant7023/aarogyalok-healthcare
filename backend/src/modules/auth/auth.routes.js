const { Router } = require('express');
const { register, login, getMe } = require('./auth.controller');
const { protect } = require('../../shared/middleware/auth.middleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
