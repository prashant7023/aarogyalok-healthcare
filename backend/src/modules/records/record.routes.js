const { Router } = require('express');
const { createRecord, getRecords, getRecord, deleteRecord, getPatientFullReport } = require('./record.controller');
const { protect } = require('../../shared/middleware/auth.middleware');
const Patient = require('../auth/patient.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Resolve uploads dir relative to this file so it works regardless of CWD
const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const valid = /pdf|jpg|jpeg|png/.test(path.extname(file.originalname).toLowerCase());
        cb(null, valid);
    },
});

const router = Router();

// All records routes require authentication; role-based logic is in the controller
router.use(protect);

// Doctor: search a patient by email to add a record on their behalf
router.get('/search-patient', async (req, res) => {
    try {
        if (!['doctor', 'hospital', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, message: 'email query required' });
        const patient = await Patient.findOne({ email: email.toLowerCase().trim() }).select('name email');
        if (!patient) return res.status(404).json({ success: false, message: 'No patient found with that email' });
        res.json({ success: true, data: patient });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/upload', upload.single('file'), createRecord);
router.get('/patient-report/:patientId', getPatientFullReport);
router.get('/', getRecords);
router.get('/:id', getRecord);
router.delete('/:id', deleteRecord);

module.exports = router;
