const SymptomReport = require('./symptom.model');
const { analyzeSymptoms } = require('../../config/llm');
const Doctor = require('../auth/doctor.model');
const Appointment = require('../queue/appointment.model');
const { sendPushToTokens } = require('../../config/firebase.admin');

const SEVERITY_ORDER = { mild: 1, moderate: 2, severe: 3, critical: 3 };
const NEARBY_HOSPITAL_CONTACT = '7014094761';

const toSeverity = (value) => String(value || 'mild').toLowerCase();

const isAbnormalCase = (aiResult) => {
    const severity = toSeverity(aiResult?.severity);
    const urgency = String(aiResult?.urgency_level || '').toLowerCase();
    return Boolean(aiResult?.abnormal_case) || severity === 'severe' || severity === 'critical' || urgency.includes('emergency');
};

const specializationRegex = (recommendedSpecialist = '', diseaseCategory = '') => {
    const source = `${recommendedSpecialist} ${diseaseCategory}`.toLowerCase().trim();
    if (!source) return null;

    const terms = new Set(source
        .split(/\s+/)
        .filter((t) => t.length > 2)
        .filter((t) => !['doctor', 'specialist', 'physician'].includes(t)));

    const escaped = Array.from(terms)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

    return escaped ? new RegExp(escaped, 'i') : null;
};

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const aiSpecialistRegex = (aiResult) => {
    const specialist = normalizeText(aiResult?.recommended_specialist);
    if (!specialist) return null;

    const terms = specialist
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((x) => x.trim())
        .filter((x) => x.length > 2)
        .filter((x) => !['doctor', 'specialist', 'physician', 'medicine', 'care'].includes(x));

    if (!terms.length) return null;
    return new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
};

const tokenizeSpecialization = (value) =>
    normalizeText(value)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 2)
        .filter((token) => !['doctor', 'specialist', 'physician', 'medicine', 'care'].includes(token));

const extractClinicalKeywords = (aiResult, symptoms = []) => {
    const possibleDiseases = Array.isArray(aiResult?.possible_diseases) ? aiResult.possible_diseases : [];
    const detailNames = Array.isArray(aiResult?.condition_details)
        ? aiResult.condition_details.map((x) => x?.name).filter(Boolean)
        : [];
    const causes = Array.isArray(aiResult?.condition_details)
        ? aiResult.condition_details.flatMap((x) => Array.isArray(x?.common_causes) ? x.common_causes : [])
        : [];

    const combined = [
        ...possibleDiseases,
        ...detailNames,
        ...causes,
        ...(Array.isArray(symptoms) ? symptoms : []),
    ];

    return [...new Set(combined.flatMap((x) => tokenizeSpecialization(x)))];
};

const getSpecializationKeywords = (aiResult, symptoms = []) => {
    const clinicalKeywords = extractClinicalKeywords(aiResult, symptoms);
    const specialistTokens = tokenizeSpecialization(aiResult?.recommended_specialist);
    const specialistOverlaps = specialistTokens.some((t) => clinicalKeywords.includes(t));

    return specialistOverlaps
        ? [...new Set([...clinicalKeywords, ...specialistTokens])]
        : clinicalKeywords;
};

const scoreDoctorRelevance = (doctor, keywords) => {
    const spec = normalizeText(doctor?.specialization || '');
    if (!spec || keywords.length === 0) return 0;

    const specTokens = new Set(tokenizeSpecialization(spec));
    const keywordSet = new Set(keywords);

    if (spec === normalizeText(Array.from(keywordSet).join(' '))) return 100;

    let score = 0;
    for (const key of keywordSet) {
        if (specTokens.has(key)) {
            score += 10;
        } else if (spec.includes(key)) {
            score += 4;
        }
    }

    const overlap = Array.from(specTokens).filter((t) => keywordSet.has(t)).length;
    score += overlap * 2;

    return score;
};

const hasMeaningfulSpecialistMatch = (aiResult, symptoms = []) => {
    const specialistTokens = tokenizeSpecialization(aiResult?.recommended_specialist);
    if (specialistTokens.length === 0) return false;

    const clinicalKeywords = extractClinicalKeywords(aiResult, symptoms);
    if (clinicalKeywords.length === 0) return false;

    return specialistTokens.some((t) => clinicalKeywords.includes(t));
};

const regexFromKeywords = (keywords = []) => {
    const escaped = keywords
        .filter((k) => typeof k === 'string' && k.trim().length > 2)
        .map((k) => k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (!escaped.length) return null;
    return new RegExp(escaped.join('|'), 'i');
};

const estimateWaitMinutes = (appointment) => {
    const current = Number(appointment?.currentTokenNumber || 0);
    const total = Number(appointment?.totalTokensIssued || 0);
    const duration = Number(appointment?.consultationDurationMinutes || 10);
    const pending = Math.max(0, total - current);
    return pending * duration;
};

const getStartOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const buildProvidersFromAppointments = async (aiResult, options = {}) => {
    const startOfToday = getStartOfToday();
    const specPattern = aiSpecialistRegex(aiResult);
    const ignoreSpecialization = Boolean(options.ignoreSpecialization);

    const query = {
        status: 'active',
        appointmentDate: { $gte: startOfToday },
    };

    if (!ignoreSpecialization && specPattern) {
        query.specialization = specPattern;
    }

    const appointments = await Appointment.find(query)
        .select('doctorId doctorName specialization address appointmentDate')
        .sort({ appointmentDate: 1 })
        .limit(20)
        .lean();

    const map = new Map();
    for (const apt of appointments) {
        if (!apt?.doctorId) continue;
        const key = String(apt.doctorId);
        if (map.has(key)) continue;

        map.set(key, {
            _id: apt.doctorId,
            name: apt.doctorName || 'Doctor',
            specialization: apt.specialization || aiResult?.recommended_specialist || 'General Physician',
            clinicAddress: apt.address || '',
            rating: 0,
            fcmTokens: [],
        });
    }

    return Array.from(map.values()).slice(0, 5);
};

const findRecommendedProviders = async (aiResult, doctors = [], symptoms = []) => {
    const specPattern = aiSpecialistRegex(aiResult);
    if (!specPattern) {
        return { providers: [], specialistMatchFound: false, providerSource: 'ai-specialist-missing' };
    }

    const keywords = tokenizeSpecialization(aiResult?.recommended_specialist);
    const ranked = doctors
        .filter((doc) => specPattern.test(String(doc?.specialization || '')))
        .map((doc) => ({
            ...doc,
            _score: scoreDoctorRelevance(doc, keywords),
        }))
        .filter((doc) => doc._score >= 1)
        .sort((a, b) => (b._score - a._score) || ((b.rating || 0) - (a.rating || 0)))
        .slice(0, 5)
        .map(({ _score, ...doc }) => doc);

    if (ranked.length > 0) {
        return { providers: ranked, specialistMatchFound: true, providerSource: 'doctor-specialization-ranked' };
    }

    // Fallback 1: derive providers from appointment records with specialization match.
    const appointmentMatched = await buildProvidersFromAppointments(aiResult, { symptoms });
    if (appointmentMatched.length > 0) {
        return { providers: appointmentMatched, specialistMatchFound: true, providerSource: 'appointment-specialization-match' };
    }

    return {
        providers: [],
        specialistMatchFound: false,
        providerSource: 'no-ai-specialist-provider',
    };
};

const findSuggestedAppointments = async (aiResult, providerIds = [], options = {}) => {
    const specPattern = aiSpecialistRegex(aiResult);
    const startOfToday = getStartOfToday();

    const query = {
        status: 'active',
        appointmentDate: { $gte: startOfToday },
    };

    if (Array.isArray(providerIds) && providerIds.length > 0) {
        query.doctorId = { $in: providerIds };
    }

    if (!query.doctorId && specPattern) {
        query.specialization = specPattern;
    }

    if (!query.doctorId && !specPattern) {
        return [];
    }

    const appointments = await Appointment.find(query)
        .select('title doctorId doctorName specialization appointmentDate address currentTokenNumber totalTokensIssued consultationDurationMinutes')
        .sort({ appointmentDate: 1 })
        .limit(5)
        .lean();

    return appointments.map((apt) => ({
        appointmentId: apt._id,
        doctorId: apt.doctorId,
        title: apt.title,
        doctorName: apt.doctorName || 'Doctor',
        specialization: apt.specialization,
        appointmentDate: apt.appointmentDate,
        address: apt.address,
        currentTokenNumber: apt.currentTokenNumber,
        totalTokensIssued: apt.totalTokensIssued,
        estimatedWaitMinutes: estimateWaitMinutes(apt),
    }));
};

const notifyAbnormalCaseToDoctors = async ({ abnormalCaseDetected, providers, aiResult, reportId, io }) => {
    if (!abnormalCaseDetected || !Array.isArray(providers) || providers.length === 0) {
        return { doctorNotified: false, doctorNotificationCount: 0 };
    }

    let notified = 0;

    for (const provider of providers) {
        const tokens = Array.isArray(provider.fcmTokens) ? provider.fcmTokens : [];
        if (tokens.length === 0) continue;

        await sendPushToTokens(tokens, {
            title: 'Urgent symptom case needs review',
            body: `Severity: ${aiResult?.severity || 'unknown'} | Specialist: ${aiResult?.recommended_specialist || 'General Physician'}`,
            data: {
                type: 'symptom_abnormal_case',
                severity: aiResult?.severity || 'unknown',
                specialist: aiResult?.recommended_specialist || 'General Physician',
                reportId: String(reportId),
            },
        });

        if (io) {
            io.to(`doctor-${provider._id}`).emit('symptom-abnormal-case', {
                reportId,
                severity: aiResult?.severity,
                specialist: aiResult?.recommended_specialist,
            });
        }

        notified += 1;
    }

    return { doctorNotified: notified > 0, doctorNotificationCount: notified };
};

const providersFromAppointments = (appointments = []) => {
    const providerMap = new Map();
    for (const apt of appointments) {
        if (!apt?.doctorId) continue;
        const key = String(apt.doctorId);
        if (providerMap.has(key)) continue;

        providerMap.set(key, {
            _id: apt.doctorId,
            name: apt.doctorName || 'Doctor',
            specialization: apt.specialization || '',
            clinicAddress: apt.address || '',
            rating: 0,
            fcmTokens: [],
        });
    }
    return Array.from(providerMap.values()).slice(0, 5);
};

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

const analyze = async (userId, symptomsInput, options = {}) => {
    const symptoms = normalizeSymptoms(symptomsInput);

    if (!symptoms.length) {
        throw new Error('Please provide at least one symptom');
    }

    const doctors = await Doctor.find({ isActive: true })
        .select('name specialization clinicAddress rating fcmTokens')
        .lean();

    const aiResult = await analyzeSymptoms(symptoms);
    const abnormalCaseDetected = isAbnormalCase(aiResult);

    // Keep AI output intact for UI/record transparency.
    // Use a routing clone for provider matching fallback logic only.
    const routingAiResult = {
        ...aiResult,
        recommended_specialist: aiResult?.recommended_specialist || 'General Physician',
    };

    const providerDecision = await findRecommendedProviders(routingAiResult, doctors, symptoms);
    let providers = providerDecision.providers || [];
    let suggestedAppointments = await findSuggestedAppointments(routingAiResult, providers.map((doc) => doc._id), { symptoms });
    let specialistMatchFound = Boolean(providerDecision.specialistMatchFound);
    let providerSource = providerDecision.providerSource || 'none';

    const matchedSpecialist = specialistMatchFound && providers.length > 0 && providers[0]?.specialization
        ? providers[0].specialization
        : null;

    // If matched doctors have no active slots, fallback to appointment-specialization pipeline.
    if (suggestedAppointments.length === 0) {
        const appointmentFallback = await findSuggestedAppointments(routingAiResult, [], { symptoms });
        if (appointmentFallback.length > 0) {
            suggestedAppointments = appointmentFallback;
            providers = providersFromAppointments(appointmentFallback);
            specialistMatchFound = true;
            providerSource = 'appointment-specialization-direct';
        }
    }

    const severityScore = SEVERITY_ORDER[toSeverity(aiResult?.severity)] || 1;
    const shouldShowHomeCare = Boolean(aiResult?.can_home_care) && severityScore <= 1;

    const queueRecommendation = shouldShowHomeCare
        ? { shouldJoinQueue: false, reason: 'Symptoms appear mild and home care may be sufficient for now.' }
        : {
            shouldJoinQueue: true,
            reason: suggestedAppointments.length > 0
                ? 'Doctor consultation is recommended. Queue token can be generated from available appointments.'
                : 'No doctor available for the AI-recommended specialist right now. Please call a nearby hospital for assistance.',
            contactNumber: suggestedAppointments.length > 0 ? '' : NEARBY_HOSPITAL_CONTACT,
        };

    if (!specialistMatchFound && providers.length > 0) {
        queueRecommendation.reason = 'Exact specialist match is not available right now. Showing currently available doctors so you can still book consultation.';
    }

    if (!specialistMatchFound && providers.length === 0) {
        queueRecommendation.shouldJoinQueue = false;
        queueRecommendation.reason = 'No doctor available for the AI-recommended specialist right now. Please call a nearby hospital.';
        queueRecommendation.contactNumber = NEARBY_HOSPITAL_CONTACT;
    }

    const report = await SymptomReport.create({
        userId,
        symptoms,
        aiResult,
        automationPlan: {
            workflowStage: shouldShowHomeCare ? 'home-care-advice' : 'doctor-and-queue-path',
            shouldShowHomeCare,
            diseaseCategory: aiResult?.disease_category || 'General Medicine',
            recommendedSpecialist: aiResult?.recommended_specialist || 'General Physician',
            matchedSpecialist: matchedSpecialist || '',
            specialistFromAI: aiResult?.recommended_specialist || 'General Physician',
            recommendedProviders: providers.map((doc) => ({
                doctorId: doc._id,
                name: doc.name,
                specialization: doc.specialization,
                clinicAddress: doc.clinicAddress,
                rating: doc.rating,
            })),
            suggestedAppointments,
            queueRecommendation,
            specialistMatchFound,
            providerSource,
            abnormalCaseDetected,
            doctorNotified: false,
            doctorNotificationCount: 0,
            notificationReason: abnormalCaseDetected
                ? 'Abnormal or high-severity symptom pattern detected by triage workflow.'
                : '',
        },
    });

    const notifyResult = await notifyAbnormalCaseToDoctors({
        abnormalCaseDetected,
        providers,
        aiResult,
        reportId: report._id,
        io: options.io,
    });

    if (notifyResult.doctorNotified) {
        report.automationPlan.doctorNotified = true;
        report.automationPlan.doctorNotificationCount = notifyResult.doctorNotificationCount;
        await report.save();
    }

    return report;
};

const getHistory = async (userId) => SymptomReport.find({ userId }).sort({ createdAt: -1 });

const getById = async (id, userId) => SymptomReport.findOne({ _id: id, userId });

module.exports = { analyze, getHistory, getById };
