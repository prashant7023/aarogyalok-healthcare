const { Router } = require('express');
const { analyzeSymptoms, getHistory, getReport } = require('./symptom.controller');
const { protect } = require('../../shared/middleware/auth.middleware');

const router = Router();

// All symptom routes: protected (any role)
router.use(protect);

router.post('/analyze', analyzeSymptoms);
router.get('/history', getHistory);
router.get('/:id', getReport);

module.exports = router;
