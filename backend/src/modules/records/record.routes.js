const { Router } = require('express');
const { createRecord, getRecords, getRecord, deleteRecord } = require('./record.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
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

// All records routes: protected + doctor or hospital only
router.use(protect, restrict('doctor', 'hospital', 'admin'));

router.post('/upload', upload.single('file'), createRecord);
router.get('/', getRecords);
router.get('/:id', getRecord);
router.delete('/:id', deleteRecord);

module.exports = router;
