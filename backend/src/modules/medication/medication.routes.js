const { Router } = require('express');
const { createMedication, getMedications, getMedication, updateMedication, deleteMedication } = require('./medication.controller');
const { protect } = require('../../shared/middleware/auth.middleware');

const router = Router();
router.use(protect);

router.route('/').post(createMedication).get(getMedications);
router.route('/:id').get(getMedication).put(updateMedication).delete(deleteMedication);

module.exports = router;
