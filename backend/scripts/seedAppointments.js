/**
 * Script to seed 10 sample appointments
 * Run this from the backend directory: node scripts/seedAppointments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../src/modules/queue/appointment.model');
const User = require('../src/modules/auth/auth.model');

// Generate time slots
function generateTimeSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMin, 0, 0);

    let currentTime = new Date(startDate);

    while (currentTime < endDate) {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        
        slots.push({ time: timeString, isBooked: false, tokenNumber: null });
        currentTime.setMinutes(currentTime.getMinutes() + durationMinutes);
    }

    return slots;
}

async function seedAppointments() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aarogyalok');
        console.log('✅ Connected to MongoDB');

        // Get a doctor user (assuming doctor@test.com exists)
        const doctor = await User.findOne({ role: 'doctor' });
        if (!doctor) {
            console.error('❌ No doctor found in database. Please create a doctor user first.');
            process.exit(1);
        }
        console.log(`📋 Using doctor: ${doctor.name} (${doctor.email})`);

        // Sample appointments data
        const appointments = [
            {
                doctorId: doctor._id,
                title: 'General Checkup Session',
                specialization: 'General',
                appointmentDate: new Date('2026-03-15'),
                timeSlots: generateTimeSlots('09:00', '12:00', 15),
                price: 500,
                address: 'City Hospital, Sector 12, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Cardiac Consultation',
                specialization: 'Cardiology',
                appointmentDate: new Date('2026-03-16'),
                timeSlots: generateTimeSlots('10:00', '13:00', 20),
                price: 1200,
                address: 'Heart Care Center, Connaught Place, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Skin & Hair Treatment',
                specialization: 'Dermatology',
                appointmentDate: new Date('2026-03-17'),
                timeSlots: generateTimeSlots('14:00', '18:00', 15),
                price: 800,
                address: 'Skin Clinic, Rajouri Garden, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Pediatric Care',
                specialization: 'Pediatrics',
                appointmentDate: new Date('2026-03-18'),
                timeSlots: generateTimeSlots('09:00', '14:00', 10),
                price: 600,
                address: 'Kids Health Center, Dwarka, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Bone & Joint Consultation',
                specialization: 'Orthopedics',
                appointmentDate: new Date('2026-03-19'),
                timeSlots: generateTimeSlots('10:00', '15:00', 30),
                price: 1000,
                address: 'Bone Care Hospital, Vasant Kunj, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Neurological Examination',
                specialization: 'Neurology',
                appointmentDate: new Date('2026-03-20'),
                timeSlots: generateTimeSlots('11:00', '16:00', 25),
                price: 1500,
                address: 'Neuro Center, AIIMS, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'ENT Checkup',
                specialization: 'ENT',
                appointmentDate: new Date('2026-03-21'),
                timeSlots: generateTimeSlots('09:00', '13:00', 15),
                price: 700,
                address: 'ENT Clinic, Lajpat Nagar, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Women\'s Health Care',
                specialization: 'Gynecology',
                appointmentDate: new Date('2026-03-22'),
                timeSlots: generateTimeSlots('10:00', '14:00', 20),
                price: 900,
                address: 'Women Care Hospital, Nehru Place, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Eye Examination',
                specialization: 'Ophthalmology',
                appointmentDate: new Date('2026-03-23'),
                timeSlots: generateTimeSlots('08:00', '12:00', 10),
                price: 600,
                address: 'Eye Care Center, Saket, Delhi',
                status: 'active'
            },
            {
                doctorId: doctor._id,
                title: 'Dental Checkup & Cleaning',
                specialization: 'Dentistry',
                appointmentDate: new Date('2026-03-24'),
                timeSlots: generateTimeSlots('15:00', '19:00', 15),
                price: 750,
                address: 'Dental Clinic, Karol Bagh, Delhi',
                status: 'active'
            }
        ];

        // Insert appointments
        const result = await Appointment.insertMany(appointments);
        
        console.log(`\n✅ Successfully created ${result.length} appointments!`);
        console.log('\n📊 Appointments Summary:');
        result.forEach((apt, index) => {
            console.log(`${index + 1}. ${apt.title} - ${apt.specialization}`);
            console.log(`   📅 Date: ${apt.appointmentDate.toDateString()}`);
            console.log(`   💰 Price: ₹${apt.price}`);
            console.log(`   🕐 Slots: ${apt.timeSlots.length}`);
            console.log(`   📍 ${apt.address}`);
            console.log('');
        });

        console.log('✨ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding appointments:', error.message);
        process.exit(1);
    }
}

seedAppointments();
