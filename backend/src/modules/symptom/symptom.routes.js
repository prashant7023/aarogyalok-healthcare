const { Router } = require('express');
const { analyzeSymptoms, getHistory, getReport } = require('./symptom.controller');
const { protect, restrict } = require('../../shared/middleware/auth.middleware');

const router = Router();

// All symptom routes: protected + patient only
router.use(protect, restrict('patient'));

router.post('/analyze', analyzeSymptoms);
router.get('/history', getHistory);
router.get('/:id', getReport);

module.exports = router;
