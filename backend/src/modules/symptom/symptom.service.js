const SymptomReport = require('./symptom.model');
const { analyzeSymptoms } = require('../../config/llm');

const normalizeSymptoms = (symptomsInput) => {
    if (Array.isArray(symptomsInput)) {
        return [...new Set(
            symptomsInput
                .filter((item) => typeof item === 'string')
                .map((item) => item.trim())
                .filter(Boolean)
        )];
    }

    if (typeof symptomsInput !== 'string') {
        return [];
    }

    const text = symptomsInput.trim();
    if (!text) return [];

    const chunks = text
        .split(/[\n,;]+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);

    // If user writes one long paragraph, keep it as a single symptom description.
    const normalized = chunks.length > 0 ? chunks : [text];
    return [...new Set(normalized)].slice(0, 25);
};

const analyze = async (userId, symptomsInput) => {
    const symptoms = normalizeSymptoms(symptomsInput);

    if (!symptoms.length) {
        throw new Error('Please provide at least one symptom');
    }

    const aiResult = await analyzeSymptoms(symptoms);
    return SymptomReport.create({ userId, symptoms, aiResult });
};

const getHistory = async (userId) => SymptomReport.find({ userId }).sort({ createdAt: -1 });

const getById = async (id, userId) => SymptomReport.findOne({ _id: id, userId });

module.exports = { analyze, getHistory, getById };
