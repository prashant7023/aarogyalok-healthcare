const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        role: { type: String, default: 'doctor' },
        phone: { type: String, trim: true },
        fcmTokens: { type: [String], default: [] },

        specialization: { type: String, default: '' },
        qualification: { type: String },
        experience: { type: Number },

        workingDays: {
            type: [String],
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        },
        workingHours: {
            start: { type: String, default: '10:00' },
            end: { type: String, default: '14:00' },
        },
        patientDuration: { type: Number, default: 10 },
        consultationFee: { type: Number, default: 500 },
        clinicAddress: { type: String },
        isActive: { type: Boolean, default: true },
        rating: { type: Number, default: 0, min: 0, max: 5 },
    },
    { timestamps: true }
);

doctorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

doctorSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

doctorSchema.methods.generateTimeSlots = function (date) {
    const slots = [];
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    if (!this.workingDays.includes(dayName)) return slots;

    const [startHour, startMin] = this.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = this.workingHours.end.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMin, 0, 0);

    while (currentTime < endTime) {
        const timeString = currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        slots.push({ time: timeString, timestamp: new Date(currentTime), available: true });
        currentTime = new Date(currentTime.getTime() + this.patientDuration * 60000);
    }

    return slots;
};

module.exports = mongoose.model('Doctor', doctorSchema);
