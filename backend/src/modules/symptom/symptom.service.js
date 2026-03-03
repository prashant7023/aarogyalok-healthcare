const SymptomReport = require('./symptom.model');
const { analyzeSymptoms } = require('../../config/gemini');

const analyze = async (userId, symptoms) => {
    const aiResult = await analyzeSymptoms(symptoms);
    return SymptomReport.create({ userId, symptoms, aiResult });
};

const getHistory = async (userId) => SymptomReport.find({ userId }).sort({ createdAt: -1 });

const getById = async (id, userId) => SymptomReport.findOne({ _id: id, userId });

module.exports = { analyze, getHistory, getById };
