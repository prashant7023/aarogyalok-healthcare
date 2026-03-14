const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(n)),
                message: 'Location coordinates must be [longitude, latitude]',
            },
        },
    },
    { _id: false }
);

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
        location: {
            type: locationSchema,
            default: undefined,
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
appointmentSchema.index({ location: '2dsphere' });

appointmentSchema.pre('validate', function sanitizeLocation(next) {
    if (!this.location) return next();

    const coordinates = this.location?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        this.location = undefined;
    }

    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
