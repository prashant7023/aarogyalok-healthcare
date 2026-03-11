/**
 * Script to clear all queue data (appointments and bookings)
 * Run this from the backend directory: node scripts/clearQueueData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../src/modules/queue/appointment.model');
const Booking = require('../src/modules/queue/booking.model');

async function clearQueueData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aarogyalok');
        console.log('✅ Connected to MongoDB');

        // Delete all appointments
        const appointmentsResult = await Appointment.deleteMany({});
        console.log(`🗑️  Deleted ${appointmentsResult.deletedCount} appointments`);

        // Delete all bookings
        const bookingsResult = await Booking.deleteMany({});
        console.log(`🗑️  Deleted ${bookingsResult.deletedCount} bookings`);

        console.log('\n✅ All queue data cleared successfully!');
        console.log(`Total removed: ${appointmentsResult.deletedCount + bookingsResult.deletedCount} documents`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing queue data:', error.message);
        process.exit(1);
    }
}

clearQueueData();
