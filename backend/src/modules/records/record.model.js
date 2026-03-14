const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
        createdByDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
        title: { type: String, required: [true, 'Record title is required'], trim: true },
        description: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        ocrText: { type: String },
        ocrSummary: { type: String },
        medicineMap: [
            {
                name: { type: String },
                dosage: { type: String },
                frequency: { type: String },
                duration: { type: String },
            },
        ],
        prescriptions: [{ type: String }],
        diagnosisHistory: [
            { date: { type: Date, default: Date.now }, diagnosis: { type: String }, doctor: { type: String } },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
