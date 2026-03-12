const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const medicationModule = require('./modules/medication');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
});

app.set('io', io);

// Socket.IO handler — queue & doctor booking rooms
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join hospital queue room (original)
    socket.on('join-hospital', (hospitalId) => {
        socket.join(`hospital-${hospitalId}`);
        console.log(`Socket ${socket.id} joined hospital-${hospitalId}`);
    });

    // Join doctor room for real-time booking updates
    socket.on('join-doctor', (doctorId) => {
        socket.join(`doctor-${doctorId}`);
        console.log(`Socket ${socket.id} joined doctor-${doctorId}`);
    });

    // Join slots room for specific doctor and date
    socket.on('join-slots', ({ doctorId, date }) => {
        const room = `slots-${doctorId}-${date}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Medication module handles its own Socket.IO setup + reminder scheduler
medicationModule.init(io);

server.listen(PORT, () => {
    console.log(`🚀 ArogyaLok server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});
