const Medication = require('../models/medication.model');
const ReminderLog = require('../models/reminderLog.model');
const scheduler = require('../reminders/reminder.scheduler');

/* ------------------------------------------------------------------ */
/*  CRUD                                                              */
/* ------------------------------------------------------------------ */

const createMedication = async (userId, data) => {
    // If endDate not provided, default to 1 year from startDate
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate
        ? new Date(data.endDate)
        : new Date(new Date(startDate).setFullYear(startDate.getFullYear() + 1));

    const med = await Medication.create({ userId, ...data, startDate, endDate });
    await scheduler.scheduleReminders(med);
    return med;
};

const getMedications = async (userId) =>
    Medication.find({ userId, isActive: true }).sort({ createdAt: -1 });

const getMedicationById = async (id, userId) =>
    Medication.findOne({ _id: id, userId });

const updateMedication = async (id, userId, data) => {
    const med = await Medication.findOneAndUpdate({ _id: id, userId }, data, { new: true });
    if (med) await scheduler.rescheduleReminders(med);
    return med;
};

const deleteMedication = async (id, userId) => {
    const med = await Medication.findOneAndUpdate(
        { _id: id, userId },
        { isActive: false },
        { new: true }
    );
    if (med) await scheduler.cancelReminders(id);
    return med;
};

/* ------------------------------------------------------------------ */
/*  Reminder queries                                                   */
/* ------------------------------------------------------------------ */

const getTodayReminders = async (userId) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return ReminderLog.find({
        userId,
        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ scheduledAt: 1 });
};

const respondToReminder = async (reminderId, userId, status) => {
    if (!['taken', 'skipped'].includes(status)) {
        throw new Error('Status must be "taken" or "skipped"');
    }
    return ReminderLog.findOneAndUpdate(
        { _id: reminderId, userId, status: 'pending' },
        { status, respondedAt: new Date() },
        { new: true }
    );
};

const getAdherenceStats = async (userId, days = 7) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await ReminderLog.find({ userId, scheduledAt: { $gte: since } });

    const total = logs.length;
    const taken = logs.filter((l) => l.status === 'taken').length;
    const missed = logs.filter((l) => l.status === 'missed').length;
    const skipped = logs.filter((l) => l.status === 'skipped').length;
    const pending = logs.filter((l) => l.status === 'pending').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { total, taken, missed, skipped, pending, adherenceRate, days };
};

module.exports = {
    createMedication,
    getMedications,
    getMedicationById,
    updateMedication,
    deleteMedication,
    getTodayReminders,
    respondToReminder,
    getAdherenceStats,
};
