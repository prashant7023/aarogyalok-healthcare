const jwt = require('jsonwebtoken');
const Patient = require('./patient.model');
const Doctor = require('./doctor.model');
const { AppError } = require('../../shared/middleware/error.middleware');

const signToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const registerUser = async (name, email, password, role, extraData = {}) => {
    // Check email uniqueness across both collections
    const existingPatient = await Patient.findOne({ email });
    const existingDoctor = await Doctor.findOne({ email });
    if (existingPatient || existingDoctor) throw new AppError('Email already in use', 400);

    if (role === 'doctor') {
        const doctor = await Doctor.create({ name, email, password, role: 'doctor', ...extraData });
        const token = signToken(doctor._id, 'doctor');
        const doctorData = doctor.toObject();
        delete doctorData.password;
        return { user: doctorData, token };
    }

    const patient = await Patient.create({ name, email, password, role: role || 'patient' });
    const token = signToken(patient._id, patient.role);
    const patientData = patient.toObject();
    delete patientData.password;
    return { user: patientData, token };
};

const loginUser = async (email, password) => {
    // Try Patient collection first, then Doctor
    let user = await Patient.findOne({ email }).select('+password');
    if (!user) {
        user = await Doctor.findOne({ email }).select('+password');
    }
    if (!user || !(await user.comparePassword(password)))
        throw new AppError('Invalid email or password', 401);

    const token = signToken(user._id, user.role);
    const userData = user.toObject();
    delete userData.password;
    return { user: userData, token };
};

module.exports = { registerUser, loginUser };
