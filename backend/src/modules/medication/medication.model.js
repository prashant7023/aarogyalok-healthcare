const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        medicineName: { type: String, required: [true, 'Medicine name is required'], trim: true },
        dosage: { type: String, required: [true, 'Dosage is required'] },
        scheduleTimes: [{ type: String }],
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        adherenceHistory: [{ date: { type: Date }, taken: { type: Boolean, default: false } }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Medication', medicationSchema);
