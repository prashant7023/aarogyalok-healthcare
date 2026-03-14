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
  disease_category: 'General Medicine',
  can_home_care: true,
  abnormal_case: false,
  severity: 'mild',
  recommended_specialist: 'General Physician',
  urgency_level: 'Visit within a week',
  home_advice: 'Stay hydrated, get adequate rest, and consult a licensed doctor for a proper diagnosis.'
};

const ALLOWED_SEVERITY = new Set(['mild', 'moderate', 'severe']);

const toConditionKey = (value) => String(value || '')
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeConditionDetails = (inputDetails, possibleDiseases) => {
  const targetDiseases = possibleDiseases.slice(0, 4);

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
      const byKey = new Map(normalized.map((item) => [toConditionKey(item.name), item]));
      const merged = targetDiseases.map((diseaseName) => {
        const key = toConditionKey(diseaseName);
        if (byKey.has(key)) return byKey.get(key);

        const looseMatch = normalized.find((item) => {
          const itemKey = toConditionKey(item.name);
          return itemKey && key && (itemKey.includes(key) || key.includes(itemKey));
        });

        if (looseMatch) {
          return {
            ...looseMatch,
            name: diseaseName,
          };
        }

        return {
          name: diseaseName,
          explanation: `${diseaseName} is a possible condition based on your symptoms. A doctor should confirm the diagnosis after examination.`,
          common_causes: ['Infection', 'Inflammation', 'Lifestyle or environmental triggers']
        };
      });

      return merged.filter(Boolean).slice(0, 4);
    }
  }

  return targetDiseases.map((name) => ({
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
      .filter((item, index, arr) => arr.findIndex((v) => toConditionKey(v) === toConditionKey(item)) === index)
      .slice(0, 5)
      .map((item) => item.trim())
    : SAFE_DEFAULT_RESULT.possible_diseases;

  const severity = typeof value.severity === 'string' ? value.severity.trim().toLowerCase() : '';
  const finalPossibleDiseases = possibleDiseases.length > 0 ? possibleDiseases : SAFE_DEFAULT_RESULT.possible_diseases;
  const conditionDetails = normalizeConditionDetails(value.condition_details, finalPossibleDiseases);
  const diseaseCategory =
    typeof value.disease_category === 'string' && value.disease_category.trim()
      ? value.disease_category.trim()
      : SAFE_DEFAULT_RESULT.disease_category;

  const canHomeCare = typeof value.can_home_care === 'boolean'
    ? value.can_home_care
    : SAFE_DEFAULT_RESULT.can_home_care;

  const abnormalCase = typeof value.abnormal_case === 'boolean'
    ? value.abnormal_case
    : SAFE_DEFAULT_RESULT.abnormal_case;

  return {
    possible_diseases: finalPossibleDiseases,
    condition_details: conditionDetails.length > 0 ? conditionDetails : SAFE_DEFAULT_RESULT.condition_details,
    disease_category: diseaseCategory,
    can_home_care: canHomeCare,
    abnormal_case: abnormalCase,
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

  const isLikelyKeywordOnlyInput = symptomList.length <= 10
    && symptomList.every((item) => {
      const wordCount = item.split(/\s+/).filter(Boolean).length;
      return wordCount <= 3 && item.length <= 28;
    });

  if (symptomList.length === 0) {
    throw new Error('Symptoms are required for AI analysis');
  }

  const systemPrompt = [
    'You are a clinical triage assistant for healthcare and medication guidance only.',
    'Only discuss health, disease risk, symptoms, medication-safety, and specialist recommendation.',
    'Do not include unrelated domains (finance, coding, law, politics, entertainment, etc.).',
    'Never provide definitive diagnosis. Keep to risk-oriented suggestions and next steps.',
    'Use all reported symptoms together; do not anchor on a single severe condition when evidence is limited.',
    'When symptoms are sparse (for example only quick-select tags), avoid over-triage unless clear emergency red flags are present.',
    'For chest pain, include both dangerous and common non-cardiac differentials when appropriate (for example GERD/acidity/gas, musculoskeletal pain, anxiety).',
    'Escalate to severe/emergency only if red-flag patterns are present: crushing or pressure-like chest pain, radiation to jaw/left arm, severe breathlessness, syncope, persistent neurologic deficit, active bleeding, or shock signs.',
    'If no clear red flags are present, prefer mild or moderate severity and mention warning signs to seek urgent care.',
    'Rank possibilities by likelihood from the provided symptoms and include at least one common benign differential when clinically plausible.',
    'Return strict JSON only, no markdown.'
  ].join(' ');

  const userPrompt = `A patient reports these symptoms:\n${symptomList.map((s) => `- ${s}`).join('\n')}\n\nInput context: ${isLikelyKeywordOnlyInput ? 'Likely short keyword/tag input with limited context.' : 'Detailed free-text input with richer context.'}\n\nTriage instructions:\n1) Consider combinations of all symptoms, not a single symptom in isolation.\n2) If chest pain is present without explicit red flags, include at least one non-cardiac possibility such as GERD/acidity/gas or chest wall pain.\n3) If severe red flags are not explicitly present, do not default to emergency severity.\n4) Keep output clinically cautious, patient-friendly, and practical.\n5) If multiple symptoms are present, provide multiple plausible differentials ranked by likelihood (not just one cause).\n6) If chest pain appears with stomach symptoms (stomach ache, acidity, burning, belching, post-meal discomfort), include GI causes such as GERD/gastritis/gas when clinically plausible.\n7) condition_details must include one entry for each item in possible_diseases, in the same order.\n\nReturn exactly this JSON shape:\n{\n  "possible_diseases": ["condition1", "condition2", "condition3"],\n  "condition_details": [\n    {\n      "name": "condition1",\n      "explanation": "Simple patient-friendly explanation (1-2 lines)",\n      "common_causes": ["cause1", "cause2", "cause3"]\n    }\n  ],\n  "disease_category": "General Medicine|Respiratory|Cardiac|ENT|Dermatology|Ophthalmology|Orthopedic|Neurology|Gastroenterology",\n  "can_home_care": true,\n  "abnormal_case": false,\n  "severity": "mild|moderate|severe",\n  "recommended_specialist": "Specialist name",\n  "urgency_level": "Emergency|Within 24 hours|Visit within a week",\n  "home_advice": "Short healthcare/medication-safe advice with emergency warning signs when relevant"\n}`;

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