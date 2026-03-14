const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SAFE_DEFAULT_RESULT = {
  possible_diseases: ['General health concern'],
  condition_details: [
    {
      name: 'General health concern',
      explanation: 'This means your symptoms may be due to a non-specific health issue and need clinical review if persistent.',
      common_causes: ['Minor infection', 'Stress or fatigue', 'Sleep disturbance']
    }
  ],
  severity: 'mild',
  recommended_specialist: 'General Physician',
  urgency_level: 'Visit within a week',
  home_advice: 'Stay hydrated, get adequate rest, and consult a licensed doctor for a proper diagnosis.'
};

const ALLOWED_SEVERITY = new Set(['mild', 'moderate', 'severe']);

const normalizeConditionDetails = (inputDetails, possibleDiseases) => {
  if (Array.isArray(inputDetails) && inputDetails.length > 0) {
    const normalized = inputDetails
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
        const commonCauses = Array.isArray(item.common_causes)
          ? item.common_causes
            .filter((cause) => typeof cause === 'string' && cause.trim())
            .slice(0, 4)
            .map((cause) => cause.trim())
          : [];

        if (!name) return null;

        return {
          name,
          explanation: explanation || `This condition may explain some of the reported symptoms and should be clinically confirmed.`,
          common_causes: commonCauses.length > 0 ? commonCauses : ['Infection', 'Inflammation', 'Allergy']
        };
      })
      .filter(Boolean)
      .slice(0, 4);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return possibleDiseases.slice(0, 4).map((name) => ({
    name,
    explanation: `${name} is a possible condition based on your symptoms. A doctor should confirm the diagnosis after examination.`,
    common_causes: ['Infection', 'Inflammation', 'Lifestyle or environmental triggers']
  }));
};

const normalizeResult = (value) => {
  if (!value || typeof value !== 'object') {
    return SAFE_DEFAULT_RESULT;
  }

  const possibleDiseases = Array.isArray(value.possible_diseases)
    ? value.possible_diseases
      .filter((item) => typeof item === 'string' && item.trim())
      .slice(0, 5)
      .map((item) => item.trim())
    : SAFE_DEFAULT_RESULT.possible_diseases;

  const severity = typeof value.severity === 'string' ? value.severity.trim().toLowerCase() : '';
  const finalPossibleDiseases = possibleDiseases.length > 0 ? possibleDiseases : SAFE_DEFAULT_RESULT.possible_diseases;
  const conditionDetails = normalizeConditionDetails(value.condition_details, finalPossibleDiseases);

  return {
    possible_diseases: finalPossibleDiseases,
    condition_details: conditionDetails.length > 0 ? conditionDetails : SAFE_DEFAULT_RESULT.condition_details,
    severity: ALLOWED_SEVERITY.has(severity) ? severity : SAFE_DEFAULT_RESULT.severity,
    recommended_specialist:
      typeof value.recommended_specialist === 'string' && value.recommended_specialist.trim()
        ? value.recommended_specialist.trim()
        : SAFE_DEFAULT_RESULT.recommended_specialist,
    urgency_level:
      typeof value.urgency_level === 'string' && value.urgency_level.trim()
        ? value.urgency_level.trim()
        : SAFE_DEFAULT_RESULT.urgency_level,
    home_advice:
      typeof value.home_advice === 'string' && value.home_advice.trim()
        ? value.home_advice.trim()
        : SAFE_DEFAULT_RESULT.home_advice,
  };
};

const parseModelJson = (rawText) => {
  const text = String(rawText || '').trim().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);
  return normalizeResult(parsed);
};

const analyzeSymptoms = async (symptoms) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing in environment variables');
  }

  const symptomList = Array.isArray(symptoms)
    ? symptoms.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
    : [];

  if (symptomList.length === 0) {
    throw new Error('Symptoms are required for AI analysis');
  }

  const systemPrompt = [
    'You are a clinical triage assistant for healthcare and medication guidance only.',
    'Only discuss health, disease risk, symptoms, medication-safety, and specialist recommendation.',
    'Do not include unrelated domains (finance, coding, law, politics, entertainment, etc.).',
    'Never provide definitive diagnosis. Keep to risk-oriented suggestions and next steps.',
    'Return strict JSON only, no markdown.'
  ].join(' ');

  const userPrompt = `A patient reports these symptoms:\n${symptomList.map((s) => `- ${s}`).join('\n')}\n\nReturn exactly this JSON shape:\n{\n  "possible_diseases": ["condition1", "condition2"],\n  "condition_details": [\n    {\n      "name": "condition1",\n      "explanation": "Simple patient-friendly explanation (1-2 lines)",\n      "common_causes": ["cause1", "cause2", "cause3"]\n    }\n  ],\n  "severity": "mild|moderate|severe",\n  "recommended_specialist": "Specialist name",\n  "urgency_level": "Emergency|Within 24 hours|Visit within a week",\n  "home_advice": "Short healthcare/medication-safe advice"\n}`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;

  if (!rawText) {
    return SAFE_DEFAULT_RESULT;
  }

  try {
    return parseModelJson(rawText);
  } catch (_) {
    return SAFE_DEFAULT_RESULT;
  }
};

const llmModel = null;

module.exports = { llmModel, analyzeSymptoms };