const Medication = require('./medication.model');
const cron = require('node-cron');

const cronJobs = new Map();

const scheduleReminder = (medicationId, times, medicineName) => {
    // Remove existing jobs
    cronJobs.forEach((job, key) => {
        if (key.startsWith(medicationId)) { job.stop(); cronJobs.delete(key); }
    });

    times.forEach((time) => {
        const [hour, minute] = time.split(':');
        const job = cron.schedule(`${minute} ${hour} * * *`, () => {
            console.log(`⏰ Reminder: Take ${medicineName} at ${time} (ID: ${medicationId})`);
        });
        cronJobs.set(`${medicationId}-${time}`, job);
    });
};

const createMedication = async (userId, data) => {
    const med = await Medication.create({ userId, ...data });
    if (data.scheduleTimes?.length) scheduleReminder(med._id.toString(), data.scheduleTimes, data.medicineName);
    return med;
};

const getMedications = async (userId) => Medication.find({ userId, isActive: true }).sort({ createdAt: -1 });

const getMedicationById = async (id, userId) => Medication.findOne({ _id: id, userId });

const updateMedication = async (id, userId, data) => {
    const med = await Medication.findOneAndUpdate({ _id: id, userId }, data, { new: true });
    if (med && data.scheduleTimes?.length) scheduleReminder(med._id.toString(), data.scheduleTimes, med.medicineName);
    return med;
};

const deleteMedication = async (id, userId) =>
    Medication.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true });

module.exports = { createMedication, getMedications, getMedicationById, updateMedication, deleteMedication };
