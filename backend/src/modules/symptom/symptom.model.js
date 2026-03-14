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
            disease_category: String,
            can_home_care: { type: Boolean, default: true },
            abnormal_case: { type: Boolean, default: false },
            // Keep both severe and critical for backward compatibility with older records.
            severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'] },
            recommended_specialist: String,
            urgency_level: String,
            home_advice: String,
        },
        automationPlan: {
            workflowStage: String,
            shouldShowHomeCare: { type: Boolean, default: false },
            diseaseCategory: String,
            recommendedSpecialist: String,
            specialistFromAI: String,
            matchedSpecialist: String,
            recommendedProviders: [
                {
                    doctorId: mongoose.Schema.Types.ObjectId,
                    name: String,
                    specialization: String,
                    clinicAddress: String,
                    rating: Number,
                    ratingCount: Number,
                },
            ],
            suggestedAppointments: [
                {
                    appointmentId: mongoose.Schema.Types.ObjectId,
                    title: String,
                    doctorName: String,
                    specialization: String,
                    appointmentDate: Date,
                    address: String,
                    currentTokenNumber: Number,
                    totalTokensIssued: Number,
                    estimatedWaitMinutes: Number,
                },
            ],
            queueRecommendation: {
                shouldJoinQueue: { type: Boolean, default: false },
                reason: String,
                contactNumber: String,
            },
            specialistMatchFound: { type: Boolean, default: true },
            providerSource: String,
            abnormalCaseDetected: { type: Boolean, default: false },
            doctorNotified: { type: Boolean, default: false },
            doctorNotificationCount: { type: Number, default: 0 },
            notificationReason: String,
        },
        appointmentBooked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SymptomReport', symptomSchema);
