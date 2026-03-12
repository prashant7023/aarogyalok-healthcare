// Test script to create sample doctors
// Run with: node src/scripts/seedDoctors.js

require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../modules/auth/doctor.model');
const bcrypt = require('bcryptjs');

const sampleDoctors = [
    {
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh@clinic.com',
        password: 'doctor123',
        phone: '9876543210',
        specialization: 'Cardiologist',
        qualification: 'MBBS, MD (Cardiology)',
        experience: 15,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: { start: '10:00', end: '14:00' },
        patientDuration: 10,
        consultationFee: 800,
        clinicAddress: '123 Heart Care Center, Mumbai',
        rating: 4.8
    },
    {
        name: 'Dr. Priya Sharma',
        email: 'priya@clinic.com',
        password: 'doctor123',
        phone: '9876543211',
        specialization: 'Dermatologist',
        qualification: 'MBBS, MD (Dermatology)',
        experience: 10,
        workingDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        workingHours: { start: '09:00', end: '13:00' },
        patientDuration: 15,
        consultationFee: 600,
        clinicAddress: '456 Skin Care Clinic, Delhi',
        rating: 4.9
    },
    {
        name: 'Dr. Amit Patel',
        email: 'amit@clinic.com',
        password: 'doctor123',
        phone: '9876543212',
        specialization: 'Pediatrician',
        qualification: 'MBBS, DCH',
        experience: 12,
        workingDays: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
        workingHours: { start: '11:00', end: '15:00' },
        patientDuration: 10,
        consultationFee: 500,
        clinicAddress: '789 Children Hospital, Bangalore',
        rating: 4.7
    },
    {
        name: 'Dr. Sneha Reddy',
        email: 'sneha@clinic.com',
        password: 'doctor123',
        phone: '9876543213',
        specialization: 'Orthopedic',
        qualification: 'MBBS, MS (Orthopedics)',
        experience: 18,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        workingHours: { start: '10:00', end: '16:00' },
        patientDuration: 20,
        consultationFee: 1000,
        clinicAddress: '321 Bone & Joint Clinic, Hyderabad',
        rating: 4.9
    },
    {
        name: 'Dr. Vikram Singh',
        email: 'vikram@clinic.com',
        password: 'doctor123',
        phone: '9876543214',
        specialization: 'General Physician',
        qualification: 'MBBS',
        experience: 8,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: { start: '08:00', end: '12:00' },
        patientDuration: 10,
        consultationFee: 400,
        clinicAddress: '555 General Hospital, Pune',
        rating: 4.5
    }
];

async function seedDoctors() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arogyalok-healthcare');
        console.log('✅ Connected to MongoDB');

        // Clear existing doctors (optional)
        await Doctor.deleteMany({});
        console.log('🗑️  Cleared existing doctors');

        // Hash passwords and create doctors
        for (const doctorData of sampleDoctors) {
            doctorData.password = await bcrypt.hash(doctorData.password, 12);
            await Doctor.create(doctorData);
            console.log(`✅ Created doctor: ${doctorData.name}`);
        }

        console.log('\n🎉 Successfully seeded all doctors!');
        console.log('\nLogin credentials for all doctors:');
        console.log('Password: doctor123');
        console.log('\nEmails:');
        sampleDoctors.forEach(d => console.log(`  - ${d.email}`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding doctors:', error);
        process.exit(1);
    }
}

seedDoctors();
