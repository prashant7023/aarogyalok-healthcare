const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const analyzeSymptoms = async (symptoms) => {
    const prompt = `
You are a medical assistant AI. A patient reports these symptoms:
${symptoms.map((s) => `- ${s}`).join('\n')}

Respond ONLY with valid JSON (no markdown):
{
  "possible_diseases": ["disease1"],
  "severity": "mild",
  "recommended_specialist": "General Physician",
  "urgency_level": "Visit within a week",
  "home_advice": "Rest and drink fluids"
}
`;
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
};

module.exports = { geminiModel, analyzeSymptoms };
