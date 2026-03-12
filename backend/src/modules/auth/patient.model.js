const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const patientSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, 'Name is required'], trim: true },
        email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
        password: { type: String, required: [true, 'Password is required'], minlength: 6 },
        role: { type: String, default: 'patient' },
        phone: { type: String, trim: true },
        fcmTokens: { type: [String], default: [] },
    },
    { timestamps: true }
);

patientSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

patientSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Use 'users' collection to keep backward compatibility with existing data
module.exports = mongoose.model('Patient', patientSchema, 'users');
