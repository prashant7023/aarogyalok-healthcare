const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authModule = require('./modules/auth');
const symptomModule = require('./modules/symptom');
const medicationModule = require('./modules/medication');
const queueModule = require('./modules/queue');
const recordModule = require('./modules/records');
const { errorHandler } = require('./shared/middleware/error.middleware');
const { requestLogger } = require('./shared/middleware/request-logger.middleware');

const app = express();

app.use(cors());
// Allow all origins
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
    res.json({ status: 'OK', project: 'ArogyaLok AI', timestamp: new Date() });
});

app.use('/api/auth', authModule.routes);
app.use('/api/symptom', symptomModule.routes);
app.use('/api/medication', medicationModule.routes);
app.use('/api/queue', queueModule.routes);
app.use('/api/records', recordModule.routes);

app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
