const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
        prescribedByDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
        prescribedByDoctorName: { type: String, default: '' },
        medicineName: { type: String, required: [true, 'Medicine name is required'], trim: true },
        dosage: { type: String, default: '' },
        scheduleTimes: [{ type: String }],
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        adherenceHistory: [{ date: { type: Date }, taken: { type: Boolean, default: false } }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Medication', medicationSchema);
