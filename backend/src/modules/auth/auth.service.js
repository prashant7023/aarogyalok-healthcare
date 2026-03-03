const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const { AppError } = require('../../shared/middleware/error.middleware');

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const registerUser = async (name, email, password, role) => {
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already in use', 400);
    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id);
    return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token };
};

const loginUser = async (email, password) => {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
        throw new AppError('Invalid email or password', 401);
    const token = signToken(user._id);
    return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token };
};

const getMe = async (userId) => User.findById(userId).select('-password');

module.exports = { registerUser, loginUser, getMe };
