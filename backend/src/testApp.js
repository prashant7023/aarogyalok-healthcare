/**
 * testApp.js — Lightweight Express app for testing (no Socket.io, no HTTP server)
 * Used by Supertest to spin up a test instance.
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authModule = require('./modules/auth');
const { errorHandler } = require('./shared/middleware/error.middleware');

const testApp = express();

testApp.use(cors());
testApp.use(express.json());

testApp.get('/health', (_req, res) => res.json({ status: 'OK' }));

testApp.use('/api/auth', authModule.routes);

testApp.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));
testApp.use(errorHandler);

module.exports = testApp;
