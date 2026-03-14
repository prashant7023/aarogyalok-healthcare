const SymptomReport = require('./symptom.model');
const { analyzeSymptoms } = require('../../config/llm');
const Doctor = require('../auth/doctor.model');
const Appointment = require('../queue/appointment.model');
const { sendPushToTokens } = require('../../config/firebase.admin');

const SEVERITY_ORDER = { mild: 1, moderate: 2, severe: 3, critical: 3 };
const GENERAL_SPECIALIST_FALLBACK = /(general|primary|family|internal|medicine)/i;
const SPECIALIZATION_ALIASES = {
    cardiologist: 'cardiology',
    cardiac: 'cardiology',
    dermatologist: 'dermatology',
    neurologist: 'neurology',
    ophthalmologist: 'ophthalmology',
    orthopedist: 'orthopedics',
    orthopedic: 'orthopedics',
    pulmonologist: 'pulmonology',
    gastroenterologist: 'gastroenterology',
    pediatrician: 'pediatrics',
    gynecologist: 'gynecology',
    'general practitioner': 'general physician',
    'primary care physician': 'general physician',
};

const SPECIALIST_HINTS = {
    'primary care physician': ['general physician', 'general medicine', 'family medicine', 'internal medicine', 'primary care'],
    'general physician': ['general physician', 'general medicine', 'family medicine', 'internal medicine', 'primary care'],
    cardiology: ['cardiology', 'cardiologist', 'heart'],
    dermatology: ['dermatology', 'dermatologist', 'skin'],
    neurology: ['neurology', 'neurologist', 'brain', 'nerve'],
    ent: ['ent', 'ear', 'nose', 'throat', 'otolaryngology'],
    ophthalmology: ['ophthalmology', 'ophthalmologist', 'eye'],
    orthopedics: ['orthopedics', 'orthopedic', 'bone', 'joint'],
    pediatrics: ['pediatrics', 'pediatrician', 'child'],
    gynecology: ['gynecology', 'gynecologist'],
    gastroenterology: ['gastroenterology', 'gastroenterologist', 'stomach', 'gut'],
    respiratory: ['respiratory', 'pulmonology', 'pulmonologist', 'lung', 'chest'],
};

const toSeverity = (value) => String(value || 'mild').toLowerCase();

const isAbnormalCase = (aiResult) => {
    const severity = toSeverity(aiResult?.severity);
    const urgency = String(aiResult?.urgency_level || '').toLowerCase();
    return Boolean(aiResult?.abnormal_case) || severity === 'severe' || severity === 'critical' || urgency.includes('emergency');
};

const specializationRegex = (recommendedSpecialist = '', diseaseCategory = '') => {
    const source = `${recommendedSpecialist} ${diseaseCategory}`.toLowerCase().trim();
    if (!source) return null;

    const terms = new Set(source.split(/\s+/).filter(Boolean));

    Object.entries(SPECIALIZATION_ALIASES).forEach(([from, to]) => {
        if (source.includes(from)) {
            to.split(/\s+/).forEach((part) => {
                if (part) terms.add(part);
            });
        }
    });

    const escaped = Array.from(terms)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

    return escaped ? new RegExp(escaped, 'i') : null;
};

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const isGeneralPrimaryIntent = (aiResult) => {
    const specialist = normalizeText(aiResult?.recommended_specialist);
    return /primary care physician|general physician|general medicine|family medicine|internal medicine/.test(specialist);
};

const getSpecializationKeywords = (aiResult) => {
    const specialist = normalizeText(aiResult?.recommended_specialist);
    const category = normalizeText(aiResult?.disease_category);
    const raw = `${specialist} ${category}`;

    const hinted = Object.entries(SPECIALIST_HINTS)
        .filter(([k]) => raw.includes(k))
        .flatMap(([, keywords]) => keywords);

    const basic = raw
        .split(/\s+/)
        .filter((k) => k.length > 3)
        .filter((k) => !['care', 'physician', 'doctor', 'medicine'].includes(k));

    return [...new Set([...hinted, ...basic])];
};

const scoreDoctorRelevance = (doctor, keywords) => {
    const spec = normalizeText(doctor?.specialization);
    if (!spec || keywords.length === 0) return 0;

    let score = 0;
    for (const key of keywords) {
        if (spec.includes(key)) {
            score += key.length > 8 ? 5 : 3;
        }
    }

    if (GENERAL_SPECIALIST_FALLBACK.test(spec) && keywords.some((k) => GENERAL_SPECIALIST_FALLBACK.test(k))) {
        score += 3;
    }

    return score;
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
    const specPattern = specializationRegex(aiResult?.recommended_specialist, aiResult?.disease_category);
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

const findRecommendedProviders = async (aiResult) => {
    const doctors = await Doctor.find({ isActive: true })
        .select('name specialization clinicAddress rating fcmTokens')
        .lean();

    // Strong rule: if AI says primary/general physician, only show general-primary tracks.
    if (isGeneralPrimaryIntent(aiResult)) {
        const generalOnly = doctors
            .filter((doc) => GENERAL_SPECIALIST_FALLBACK.test(doc.specialization || ''))
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5);

        if (generalOnly.length > 0) {
            return { providers: generalOnly, specialistMatchFound: true, providerSource: 'doctor-specialization-general' };
        }
    }

    const keywords = getSpecializationKeywords(aiResult);
    const ranked = doctors
        .map((doc) => ({
            ...doc,
            _score: scoreDoctorRelevance(doc, keywords),
        }))
        .filter((doc) => doc._score >= 3)
        .sort((a, b) => (b._score - a._score) || ((b.rating || 0) - (a.rating || 0)))
        .slice(0, 5)
        .map(({ _score, ...doc }) => doc);

    if (ranked.length > 0) {
        return { providers: ranked, specialistMatchFound: true, providerSource: 'doctor-specialization-ranked' };
    }

    // Prefer primary/general doctors as safe fallback rather than unrelated specialists.
    const generalFallback = doctors
        .filter((doc) => GENERAL_SPECIALIST_FALLBACK.test(doc.specialization || ''))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5);

    if (generalFallback.length > 0) {
        return { providers: generalFallback, specialistMatchFound: false, providerSource: 'doctor-specialization-general-fallback' };
    }

    // Fallback 1: derive providers from appointment records with specialization match.
    const appointmentMatched = await buildProvidersFromAppointments(aiResult);
    if (appointmentMatched.length > 0) {
        return { providers: appointmentMatched, specialistMatchFound: true, providerSource: 'appointment-specialization-match' };
    }

    // Fallback 2: show currently available providers even if specialization does not match.
    const appointmentAny = await buildProvidersFromAppointments(aiResult, { ignoreSpecialization: true });
    return {
        providers: appointmentAny,
        specialistMatchFound: false,
        providerSource: appointmentAny.length > 0 ? 'appointment-any-available' : 'none',
    };
};

const findSuggestedAppointments = async (aiResult, providerIds = []) => {
    const specPattern = specializationRegex(aiResult?.recommended_specialist, aiResult?.disease_category);
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

    const aiResult = await analyzeSymptoms(symptoms);
    const abnormalCaseDetected = isAbnormalCase(aiResult);
    const providerDecision = await findRecommendedProviders(aiResult);
    let providers = providerDecision.providers || [];
    let suggestedAppointments = await findSuggestedAppointments(aiResult, providers.map((doc) => doc._id));
    let specialistMatchFound = Boolean(providerDecision.specialistMatchFound);
    let providerSource = providerDecision.providerSource || 'none';

    // If matched doctors have no active slots, fallback to appointment-specialization pipeline.
    if (suggestedAppointments.length === 0) {
        const appointmentFallback = await findSuggestedAppointments(aiResult, []);
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
                : 'Doctor consultation is recommended. No immediate appointment was found; try provider contact directly.',
        };

    if (!specialistMatchFound && providers.length > 0) {
        queueRecommendation.reason = 'Exact specialist match is not available right now. Showing currently available doctors so you can still book consultation.';
    }

    if (!specialistMatchFound && providers.length === 0) {
        queueRecommendation.reason = 'No matching specialist or active appointments available right now. Please try again later or contact hospital support.';
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
