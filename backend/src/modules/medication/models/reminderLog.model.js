const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema(
    {
        medicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medication',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: true,
            index: true,
        },
        medicineName: { type: String, required: true },
        dosage: { type: String },
        scheduledAt: { type: Date, required: true },
        status: {
            type: String,
            enum: ['pending', 'taken', 'skipped', 'missed'],
            default: 'pending',
        },
        respondedAt: { type: Date },
        notifiedVia: {
            type: String,
            enum: ['socket', 'redis', 'none'],
            default: 'none',
        },
    },
    { timestamps: true }
);

// Quickly find today's logs for a user
reminderLogSchema.index({ userId: 1, scheduledAt: 1 });
// Prevent duplicate reminders for the same med + scheduled time
reminderLogSchema.index({ medicationId: 1, scheduledAt: 1 }, { unique: true });

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
