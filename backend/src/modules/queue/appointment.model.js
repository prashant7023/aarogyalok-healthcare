const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        doctorId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Doctor', 
            required: true 
        },
        doctorName: {
            type: String,
            trim: true,
            default: null,
        },
        title: { 
            type: String, 
            required: true,
            trim: true 
        },
        specialization: { 
            type: String, 
            required: true,
            trim: true 
        },
        appointmentDate: { 
            type: Date, 
            required: true 
        },
        scheduleStartTime: {
            type: String,
            default: '09:00'
        },
        consultationDurationMinutes: {
            type: Number,
            required: true,
            min: 1,
            max: 180
        },
        price: { 
            type: Number, 
            required: true,
            min: 0 
        },
        address: { 
            type: String, 
            required: true,
            trim: true 
        },
        status: { 
            type: String, 
            enum: ['active', 'completed', 'cancelled'], 
            default: 'active' 
        },
        totalTokensIssued: { type: Number, default: 0 },
        currentTokenNumber: { type: Number, default: null }
    },
    { timestamps: true }
);

// Index for faster queries
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ specialization: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
