const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        phone: { type: String, trim: true },
        specialization: { type: String, required: true }, // Cardiologist, Dermatologist, etc.
        qualification: { type: String }, // MBBS, MD, etc.
        experience: { type: Number }, // Years of experience
        
        // Working Schedule
        workingDays: {
            type: [String],
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
        workingHours: {
            start: { type: String, required: true, default: '10:00' }, // HH:mm format
            end: { type: String, required: true, default: '14:00' }
        },
        
        // Time management
        patientDuration: { type: Number, required: true, default: 10 }, // minutes per patient
        consultationFee: { type: Number, default: 500 },
        
        // Additional info
        clinicAddress: { type: String },
        isActive: { type: Boolean, default: true },
        rating: { type: Number, default: 0, min: 0, max: 5 }
    },
    { timestamps: true }
);

// Generate time slots based on working hours and patient duration
doctorSchema.methods.generateTimeSlots = function(date) {
    const slots = [];
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if doctor works on this day
    if (!this.workingDays.includes(dayName)) {
        return slots;
    }
    
    const [startHour, startMin] = this.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = this.workingHours.end.split(':').map(Number);
    
    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, endMin, 0, 0);
    
    while (currentTime < endTime) {
        const timeString = currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        
        slots.push({
            time: timeString,
            timestamp: new Date(currentTime),
            available: true
        });
        
        currentTime = new Date(currentTime.getTime() + this.patientDuration * 60000);
    }
    
    return slots;
};

module.exports = mongoose.model('Doctor', doctorSchema);
