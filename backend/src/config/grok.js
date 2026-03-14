const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_DEFAULT_MODEL = 'grok-3-mini';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const stripCodeFences = (text = '') =>
    String(text)
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

const normalizeMedicineMap = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((m) => ({
            name: String(m?.name || '').trim(),
            dosage: String(m?.dosage || '').trim(),
            frequency: String(m?.frequency || '').trim(),
            duration: String(m?.duration || '').trim(),
        }))
        .filter((m) => m.name);
};

const extractMedicalDataFromText = async (text = '') => {
    const cleanText = String(text || '').trim();
    if (!cleanText) return { summary: '', medicineMap: [] };

    const xaiKey = process.env.GROK_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!xaiKey && !groqKey) {
        return { summary: '', medicineMap: [] };
    }

    const usingXai = Boolean(xaiKey);
    const apiKey = usingXai ? xaiKey : groqKey;
    const apiUrl =
        process.env.GROK_API_URL || (usingXai ? XAI_API_URL : process.env.GROQ_API_URL || GROQ_API_URL);
    const model =
        process.env.GROK_MODEL || (usingXai ? XAI_DEFAULT_MODEL : process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL);

    const prompt = `
You are an expert medical records parser.
Extract a concise patient-friendly summary and medicines from this OCR text.

OCR text:
${cleanText}

Return ONLY valid JSON in this exact shape:
{
  "summary": "string",
  "medicineMap": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string"
    }
  ]
}

Rules:
- Do not hallucinate medicines.
- Keep unknown fields as empty string.
- If no medicines found, return an empty array.
`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            return { summary: '', medicineMap: [] };
        }

        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(stripCodeFences(content));

        return {
            summary: String(parsed?.summary || '').trim(),
            medicineMap: normalizeMedicineMap(parsed?.medicineMap),
        };
    } catch (_error) {
        return { summary: '', medicineMap: [] };
    }
};

module.exports = { extractMedicalDataFromText, normalizeMedicineMap };
