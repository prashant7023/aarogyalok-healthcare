const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        symptoms: [{ type: String, required: true }],
        aiResult: {
            possible_diseases: [String],
            severity: { type: String, enum: ['mild', 'moderate', 'critical'] },
            recommended_specialist: String,
            urgency_level: String,
            home_advice: String,
        },
        appointmentBooked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SymptomReport', symptomSchema);
