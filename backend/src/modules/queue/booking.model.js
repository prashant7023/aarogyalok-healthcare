const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        appointmentId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Appointment', 
            required: true 
        },
        patientId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Patient', 
            required: true 
        },
        patientName: { 
            type: String, 
            required: true,
            trim: true 
        },
        patientAge: { 
            type: Number, 
            required: true,
            min: 1,
            max: 120 
        },
        patientGender: { 
            type: String, 
            enum: ['Male', 'Female', 'Other'], 
            required: true 
        },
        description: { 
            type: String, 
            required: true,
            trim: true 
        },
        timeSlot: { 
            type: String, 
            required: true 
        },
        status: { 
            type: String, 
            enum: ['confirmed', 'completed', 'cancelled'], 
            default: 'confirmed' 
        },
        markedBy: {
            type: String,
            enum: ['pending', 'present', 'absent', 'completed'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

// Index for faster queries
bookingSchema.index({ appointmentId: 1 });
bookingSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
