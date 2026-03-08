/**
 * medication/index.js — Single entry point for the Medication module.
 *
 * app.js    → uses  module.routes   to mount /api/medication
 * server.js → calls module.init(io) once after Socket.IO is ready
 *
 * init(io) does three things self-contained within this module:
 *   1. Registers a Socket.IO middleware to decode JWT → socket.userId
 *   2. Registers a Socket.IO connection handler to auto-join user rooms
 *   3. Starts the Redis-backed reminder scheduler (cron jobs + initial seed)
 *
 * Internal folder structure:
 *   models/
 *     medication.model.js      Mongoose Medication schema
 *     reminderLog.model.js     Mongoose ReminderLog schema
 *   services/
 *     medication.service.js    Business logic + reminder queries
 *   controllers/
 *     medication.controller.js Express request handlers
 *   routes/
 *     medication.routes.js     Express router (REST API)
 *   reminders/
 *     reminder.scheduler.js    Redis cron scheduler
 */

const jwt = require('jsonwebtoken');
const routes = require('./routes/medication.routes');
const scheduler = require('./reminders/reminder.scheduler');

/**
 * init(io)
 * Call once from server.js after `io` is created.
 * This keeps ALL medication-related socket concerns out of server.js.
 */
const init = (io) => {
    // --- 1. JWT middleware: attach userId to every socket ---
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.id;
            } catch {
                // Bad token — allow connection, just no personal room
            }
        }
        next();
    });

    // --- 2. Connection handler: auto-join personal user room ---
    // Socket.IO supports multiple connection handlers; this coexists
    // cleanly alongside the join-hospital handler in server.js
    io.on('connection', (socket) => {
        if (socket.userId) {
            socket.join(`user-${socket.userId}`);
        }
    });

    // --- 3. Start Redis reminder scheduler ---
    scheduler.start(io);
};

module.exports = { routes, init };
