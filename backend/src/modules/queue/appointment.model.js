const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        doctorId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Doctor', 
            required: true 
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
        timeSlots: [{
            time: { type: String, required: true }, // e.g., "10:00 AM"
            isBooked: { type: Boolean, default: false }
        }],
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
        totalSlots: { type: Number, default: 0 },
        bookedSlots: { type: Number, default: 0 }
    },
    { timestamps: true }
);

// Index for faster queries
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ specialization: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
