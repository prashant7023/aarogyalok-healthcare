const asyncHandler = require('../../shared/utils/asyncHandler');
const authService = require('./auth.service');
const { sendSuccess } = require('../../shared/utils/response');

const register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const result = await authService.registerUser(name, email, password, role);
    sendSuccess(res, result, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    sendSuccess(res, result, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    sendSuccess(res, user, 'User fetched');
});

module.exports = { register, login, getMe };
