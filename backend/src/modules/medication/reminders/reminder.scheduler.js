/**
 * reminder.scheduler.js
 *
 * Redis Sorted Set-based scheduler for medication reminders.
 *
 * Data structure:
 *   Key   : med:reminders  (Sorted Set)
 *   Score : Unix timestamp (fire time)
 *   Value : JSON { medicationId, userId, medicineName, dosage, scheduledAt }
 *
 * Flow:
 *   1. Med create/update  → pushToRedis() — pre-seed next 7 days
 *   2. Every 60 s cron    → fireDueReminders() — emit Socket.IO + create ReminderLog
 *   3. Every 30 min cron  → markMissedReminders() — pending + >2 hrs old → missed
 *   4. Nightly 00:05      → reseedAllReminders() — keep sorted set fresh
 */

const cron = require('node-cron');
const { getRedisClient } = require('../../../config/redis');
const ReminderLog = require('../models/reminderLog.model');
const User = require('../../auth/auth.model');
const { sendPushToTokens } = require('../../../config/firebase.admin');
const Medication = require('../models/medication.model');

const REMINDER_KEY = 'med:reminders';
const SCHEDULE_DAYS = 7;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

const buildFireTimes = (scheduleTimes, startDate, endDate) => {
    const now = new Date();
    // 2-minute grace: include reminders that fired up to 2 min ago
    // so a medication added at exactly 15:47:30 still catches the 15:47 slot
    const gracedNow = new Date(now.getTime() - 2 * 60 * 1000);

    const capEnd = new Date(now);
    capEnd.setDate(capEnd.getDate() + SCHEDULE_DAYS);

    // Default endDate to 7 days from startDate when not provided
    const resolvedEnd = endDate
        ? new Date(endDate)
        : new Date(new Date(startDate).setDate(new Date(startDate).getDate() + SCHEDULE_DAYS));
    const windowEnd = new Date(Math.min(resolvedEnd.getTime(), capEnd.getTime()));

    const cursor = new Date(Math.max(new Date(startDate).getTime(), gracedNow.getTime()));
    cursor.setHours(0, 0, 0, 0);

    const fireTimes = [];
    while (cursor <= windowEnd) {
        for (const t of scheduleTimes) {
            const [h, m] = t.split(':').map(Number);
            const dt = new Date(cursor);
            dt.setHours(h, m, 0, 0);
            // Include if in the future OR within the 2-min grace window
            if (dt >= gracedNow) fireTimes.push(dt);
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return fireTimes;
};

const pushToRedis = async (redis, medication) => {
    const fireTimes = buildFireTimes(
        medication.scheduleTimes,
        medication.startDate,
        medication.endDate
    );
    if (!fireTimes.length) return;

    const pipeline = redis.pipeline();
    for (const dt of fireTimes) {
        const payload = JSON.stringify({
            medicationId: medication._id.toString(),
            userId: medication.userId.toString(),
            medicineName: medication.medicineName,
            dosage: medication.dosage,
            scheduledAt: dt.toISOString(),
        });
        pipeline.zadd(REMINDER_KEY, dt.getTime(), payload);
    }
    await pipeline.exec();
    console.log(`📅 Scheduled ${fireTimes.length} reminder(s) for "${medication.medicineName}"`);
};

const removeFromRedis = async (redis, medicationId) => {
    const all = await redis.zrange(REMINDER_KEY, 0, -1);
    const toRemove = all.filter((val) => {
        try { return JSON.parse(val).medicationId === medicationId; }
        catch { return false; }
    });
    if (toRemove.length) {
        await redis.zrem(REMINDER_KEY, ...toRemove);
        console.log(`🗑️  Removed ${toRemove.length} future reminder(s) for med ${medicationId}`);
    }
};

/* ------------------------------------------------------------------ */
/*  Public API — used by services/medication.service.js               */
/* ------------------------------------------------------------------ */

const scheduleReminders = async (medication) => {
    const redis = getRedisClient();
    if (!redis) return;
    await pushToRedis(redis, medication);
    // Defer by one event-loop tick so fireDueReminders (const) is already initialised,
    // then immediately fire anything due — catches reminders added right at fire time
    setImmediate(() => fireDueReminders().catch((e) => console.error('Immediate fire error:', e.message)));
};

const rescheduleReminders = async (medication) => {
    const redis = getRedisClient();
    if (!redis) return;
    await removeFromRedis(redis, medication._id.toString());
    await pushToRedis(redis, medication);
};

const cancelReminders = async (medicationId) => {
    const redis = getRedisClient();
    if (!redis) return;
    await removeFromRedis(redis, medicationId);
};

/* ------------------------------------------------------------------ */
/*  Cron jobs                                                         */
/* ------------------------------------------------------------------ */

let _io = null;

const fireDueReminders = async () => {
    const redis = getRedisClient();
    if (!redis) return;

    const nowTs = Date.now();
    const due = await redis.zrangebyscore(REMINDER_KEY, 0, nowTs);
    if (!due.length) return;

    for (const raw of due) {
        try {
            const data = JSON.parse(raw);

            // Idempotent: skip if log already exists for this med+time
            const existing = await ReminderLog.findOne({
                medicationId: data.medicationId,
                scheduledAt: new Date(data.scheduledAt),
            });
            if (existing) continue;

            const log = await ReminderLog.create({
                medicationId: data.medicationId,
                userId: data.userId,
                medicineName: data.medicineName,
                dosage: data.dosage,
                scheduledAt: new Date(data.scheduledAt),
                status: 'pending',
                notifiedVia: _io ? 'socket' : 'none',
            });

            // 1. Socket.IO — real-time in-app toast
            if (_io) {
                _io.to(`user-${data.userId}`).emit('medication-reminder', {
                    reminderId: log._id,
                    medicineName: data.medicineName,
                    dosage: data.dosage,
                    scheduledAt: data.scheduledAt,
                    message: `Time to take ${data.medicineName}`,
                });
            }

            // 2. FCM push — OS-level notification (works when tab is closed)
            try {
                const user = await User.findById(data.userId).select('fcmTokens');
                if (user?.fcmTokens?.length) {
                    await sendPushToTokens(
                        user.fcmTokens,
                        {
                            title: '💊 Medication Reminder',
                            body: data.dosage
                                ? `Time to take ${data.medicineName} — ${data.dosage}`
                                : `Time to take ${data.medicineName}`,
                            data: {
                                reminderId: String(log._id),
                                medicineName: data.medicineName,
                                dosage: data.dosage || '',
                                scheduledAt: data.scheduledAt,
                            },
                        },
                        user
                    );
                }
            } catch (pushErr) {
                console.warn('[FCM] Push failed (non-fatal):', pushErr.message);
            }

            console.log(`⏰ Fired: "${data.medicineName}" → user ${data.userId}`);
        } catch (err) {
            console.error('Reminder fire error:', err.message);
        }
    }

    await redis.zremrangebyscore(REMINDER_KEY, 0, nowTs);
};

const markMissedReminders = async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await ReminderLog.updateMany(
        { status: 'pending', scheduledAt: { $lt: twoHoursAgo } },
        { $set: { status: 'missed' } }
    );
    if (result.modifiedCount > 0) {
        console.log(`🔴 Marked ${result.modifiedCount} reminder(s) as missed`);
    }
};

const reseedAllReminders = async () => {
    const redis = getRedisClient();
    if (!redis) return;
    try {
        const activeMeds = await Medication.find({ isActive: true });
        for (const med of activeMeds) await pushToRedis(redis, med);
        console.log(`🌙 Nightly reseed: seeded ${activeMeds.length} active medication(s)`);
    } catch (err) {
        console.error('Reseed error:', err.message);
    }
};

/* ------------------------------------------------------------------ */
/*  start() — called by medication/index.js init(io)                 */
/* ------------------------------------------------------------------ */

const start = (io) => {
    _io = io;

    cron.schedule('* * * * *', () =>
        fireDueReminders().catch((e) => console.error('Fire cron:', e.message)));

    cron.schedule('*/30 * * * *', () =>
        markMissedReminders().catch((e) => console.error('Missed cron:', e.message)));

    cron.schedule('5 0 * * *', () =>
        reseedAllReminders().catch((e) => console.error('Reseed cron:', e.message)));

    reseedAllReminders(); // seed on startup

    console.log('✅ Medication reminder scheduler started');
};

module.exports = { scheduleReminders, rescheduleReminders, cancelReminders, start };
