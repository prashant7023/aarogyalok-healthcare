const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
        symptoms: [{ type: String, required: true }],
        aiResult: {
            possible_diseases: [String],
            condition_details: [
                {
                    name: String,
                    explanation: String,
                    common_causes: [String],
                },
            ],
            // Keep both severe and critical for backward compatibility with older records.
            severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'] },
            recommended_specialist: String,
            urgency_level: String,
            home_advice: String,
        },
        appointmentBooked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SymptomReport', symptomSchema);
