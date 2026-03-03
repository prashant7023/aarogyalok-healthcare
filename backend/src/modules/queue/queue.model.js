const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
    {
        hospitalId: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        tokenNumber: { type: Number, required: true },
        status: { type: String, enum: ['waiting', 'serving', 'done', 'cancelled'], default: 'waiting' },
        estimatedWaitMinutes: { type: Number },
    },
    { timestamps: true }
);

module.exports = mongoose.model('QueueToken', queueSchema);
