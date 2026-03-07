const { Router } = require('express');
const { createMedication, getMedications, getMedication, updateMedication, deleteMedication } = require('./medication.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');

const router = Router();

// All medication routes: protected + patient only
router.use(protect, restrict('patient'));

router.route('/').post(createMedication).get(getMedications);
router.route('/:id').get(getMedication).put(updateMedication).delete(deleteMedication);

module.exports = router;
