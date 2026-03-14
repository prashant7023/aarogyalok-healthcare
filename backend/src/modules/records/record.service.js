const HealthRecord = require('./record.model');
const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const { extractMedicalDataFromText, normalizeMedicineMap } = require('../../config/grok');
const medicationService = require('../medication/services/medication.service');
const Medication = require('../medication/models/medication.model');
const SymptomReport = require('../symptom/symptom.model');
const Booking = require('../queue/booking.model');
const Appointment = require('../queue/appointment.model');
const Patient = require('../auth/patient.model');

const summarizeText = (text = '') => {
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const sentences = clean
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 4);
    return sentences.join(' ');
};

const extractMedicineMap = (text = '') => {
    const lines = String(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const results = [];
    const medicineRegex =
        /\b([A-Z][A-Za-z0-9\-]{2,})\b(?:\s+(\d{1,4}\s?(?:mg|mcg|g|ml)))?(?:.*?\b(OD|BD|TDS|HS|SOS|once daily|twice daily|thrice daily|daily)\b)?(?:.*?\b(\d+\s?(?:days?|weeks?|months?))\b)?/i;

    for (const line of lines) {
        const match = line.match(medicineRegex);
        if (!match) continue;
        const name = match[1];
        if (!name || name.length < 3) continue;
        const dosage = match[2] || '';
        const frequency = match[3] || '';
        const duration = match[4] || '';
        const hasFormHint = /\b(tab|tablet|cap|capsule|syrup|inj|injection|drop|ointment)\b/i.test(line);
        if (!dosage && !frequency && !duration && !hasFormHint) continue;
        results.push({
            name,
            dosage,
            frequency,
            duration,
        });
    }

    const seen = new Set();
    return results.filter((m) => {
        const key = `${m.name}|${m.dosage}|${m.frequency}|${m.duration}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const parseMedicineMap = (incomingMap, fallbackText, aiMap = []) => {
    const normalizedAiMap = normalizeMedicineMap(aiMap);
    if (Array.isArray(incomingMap)) return normalizeMedicineMap(incomingMap);
    if (typeof incomingMap === 'string' && incomingMap.trim()) {
        try {
            const parsed = JSON.parse(incomingMap);
            if (Array.isArray(parsed)) return normalizeMedicineMap(parsed);
        } catch (_error) {
            // ignore invalid client payload and use fallback extraction
        }
    }
    if (normalizedAiMap.length) return normalizedAiMap;
    return extractMedicineMap(fallbackText);
};

const getPdfText = async (uploadedFile) => {
    if (!uploadedFile?.mimetype?.includes('pdf') || !uploadedFile?.path) return '';
    try {
        const fileBuffer = await fs.readFile(uploadedFile.path);
        const parsed = await pdfParse(fileBuffer);
        return (parsed?.text || '').trim();
    } catch (_error) {
        return '';
    }
};

const parseDurationDays = (duration = '') => {
    const raw = String(duration || '').trim().toLowerCase();
    if (!raw) return null;

    const match = raw.match(/(\d+)\s*(d|day|days|w|week|weeks|m|month|months)?/i);
    if (!match) return null;

    const value = Number(match[1]);
    const unit = (match[2] || 'days').toLowerCase();
    if (!Number.isFinite(value) || value <= 0) return null;

    if (unit === 'd' || unit.startsWith('day')) return value;
    if (unit === 'w' || unit.startsWith('week')) return value * 7;
    if (unit === 'm' || unit.startsWith('month')) return value * 30;
    return value;
};

const inferDurationForMedicines = (medicineMap = []) => {
    return medicineMap.map((m) => {
        const days = parseDurationDays(m?.duration);
        return {
            ...m,
            duration: days ? `${days}d` : '',
        };
    });
};

const frequencyToScheduleTimes = (frequency = '') => {
    const f = String(frequency || '').trim().toUpperCase();
    if (!f) return ['09:00'];

    if (['OD', 'DAILY', 'ONCE DAILY', 'QD'].some((k) => f.includes(k))) return ['09:00'];
    if (['BD', 'BID', 'TWICE DAILY', 'Q12H'].some((k) => f.includes(k))) return ['09:00', '21:00'];
    if (['TDS', 'TID', 'THRICE DAILY', 'Q8H'].some((k) => f.includes(k))) return ['08:00', '14:00', '20:00'];
    if (['Q6H', 'QID', '4 TIMES'].some((k) => f.includes(k))) return ['00:00', '06:00', '12:00', '18:00'];
    if (['HS', 'BEDTIME'].some((k) => f.includes(k))) return ['22:00'];
    if (['SOS', 'PRN'].some((k) => f.includes(k))) return ['09:00'];

    return ['09:00'];
};

const createMedicationRemindersFromMap = async (userId, medicineMap = []) => {
    const startDate = new Date();

    for (const med of medicineMap) {
        const durationDays = parseDurationDays(med.duration);
        if (!durationDays) continue;

        const existingActive = await Medication.findOne({
            userId,
            isActive: true,
            medicineName: med.name,
            dosage: med.dosage || '',
            endDate: { $gte: startDate },
        }).lean();
        if (existingActive) continue;

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        await medicationService.createMedication(userId, {
            medicineName: med.name,
            dosage: med.dosage || '',
            scheduleTimes: frequencyToScheduleTimes(med.frequency),
            startDate,
            endDate,
        });
    }
};

const createRecord = async (userId, data, fileUrl, uploadedFile) => {
    const pdfText = await getPdfText(uploadedFile);
    const ocrText = (data.ocrText || data.extractedText || pdfText || '').trim();
    const sourceTextForSummary = ocrText || String(data.description || '').trim() || String(data.title || '').trim();
    const aiExtraction = await extractMedicalDataFromText(sourceTextForSummary);
    const ocrSummary =
        (data.ocrSummary || data.extractedSummary || aiExtraction.summary || summarizeText(sourceTextForSummary)).trim();
    const sourceTextForMedicines = ocrText || String(data.description || '').trim();
    const parsedMedicineMap = parseMedicineMap(
        data.medicineMap,
        sourceTextForMedicines,
        aiExtraction.medicineMap
    );
    const medicineMap = inferDurationForMedicines(parsedMedicineMap);

    const record = await HealthRecord.create({
        userId,
        ...data,
        ocrText,
        ocrSummary,
        medicineMap,
        fileUrl,
    });

    if (medicineMap.length) {
        await createMedicationRemindersFromMap(userId, medicineMap);
    }

    return record;
};

// Patients: own records only
const getRecords = async (userId) => HealthRecord.find({ userId }).sort({ createdAt: -1 });

// Doctors / hospital / admin: all records with patient info populated
const getAllRecords = async () =>
    HealthRecord.find().populate('userId', 'name email').sort({ createdAt: -1 });

const getRecordById = async (id, userId, isPrivileged) => {
    if (isPrivileged) return HealthRecord.findById(id).populate('userId', 'name email');
    return HealthRecord.findOne({ _id: id, userId });
};

const deleteRecord = async (id, userId, isPrivileged) => {
    if (isPrivileged) return HealthRecord.findByIdAndDelete(id);
    return HealthRecord.findOneAndDelete({ _id: id, userId });
};

const getPatientFullReport = async (patientId) => {
    const patient = await Patient.findById(patientId).lean();
    const patientName = String(patient?.name || '').trim();

    const bookingQuery = patientName
        ? {
            $or: [
                { patientId },
                { patientName: { $regex: `^${patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
            ],
        }
        : { patientId };

    const [
        records,
        medications,
        symptoms,
        bookings,
    ] = await Promise.all([
        HealthRecord.find({ userId: patientId }).sort({ createdAt: -1 }).lean(),
        Medication.find({ userId: patientId }).sort({ createdAt: -1 }).lean(),
        SymptomReport.find({ userId: patientId }).sort({ createdAt: -1 }).lean(),
        Booking.find(bookingQuery).sort({ createdAt: -1 }).lean(),
    ]);

    const appointmentIds = [...new Set(bookings.map((b) => String(b.appointmentId)).filter(Boolean))];
    const appointments = await Appointment.find({ _id: { $in: appointmentIds } })
        .populate('doctorId', 'name')
        .lean();
    const appointmentMap = new Map(appointments.map((a) => [String(a._id), a]));

    const bloodTestRecords = records.filter((r) => {
        const text = `${r.title || ''} ${r.description || ''} ${r.ocrSummary || ''}`.toLowerCase();
        return /(blood|cbc|hemoglobin|platelet|rbc|wbc|lab|test report)/i.test(text);
    });

    const prescriptionRecords = records.filter((r) =>
        Array.isArray(r.medicineMap) && r.medicineMap.length > 0
    );
    const uploadedFiles = records
        .filter((r) => !!r.fileUrl)
        .map((r) => ({
            _id: r._id,
            title: r.title || 'Uploaded File',
            fileUrl: r.fileUrl || '',
            fileType: r.fileType || '',
            description: r.description || '',
            createdAt: r.createdAt || null,
        }));

    const uploadedPdfs = uploadedFiles.filter((f) => {
        const typeHint = String(f.fileType || '').toLowerCase();
        const urlHint = String(f.fileUrl || '').toLowerCase();
        const titleHint = String(f.title || '').toLowerCase();
        const descHint = String(f.description || '').toLowerCase();

        return (
            typeHint.includes('pdf') ||
            /\.pdf($|\?|#)/i.test(urlHint) ||
            /\.pdf($|\s)/i.test(titleHint) ||
            /\bpdf\b/i.test(descHint)
        );
    });

    const prescriptionPdfs = records
        .filter((r) => {
            const typeHint = String(r.fileType || '').toLowerCase();
            const urlHint = String(r.fileUrl || '').toLowerCase();
            const textHint = `${r.title || ''} ${r.description || ''} ${r.ocrSummary || ''}`.toLowerCase();
            const hasRxHint = /(prescription|rx|medicine|medication)/i.test(textHint);
            const hasMedicineMap = Array.isArray(r.medicineMap) && r.medicineMap.length > 0;
            const isPdf = typeHint.includes('pdf') || urlHint.endsWith('.pdf');
            return isPdf && (hasRxHint || hasMedicineMap);
        })
        .map((r) => ({
            _id: r._id,
            title: r.title || 'Prescription',
            fileUrl: r.fileUrl || '',
            createdAt: r.createdAt || null,
        }));

    const allPrescribedMedicines = prescriptionRecords.flatMap((r) => r.medicineMap || []);

    const consultationHistory = bookings
        .map((b) => {
            const apt = appointmentMap.get(String(b.appointmentId));
            const doctorName = apt?.doctorId?.name || apt?.doctorName || 'Unknown';
            const appointmentDate = apt?.appointmentDate || null;
            const consultationDate = appointmentDate || b.updatedAt || b.createdAt || null;
            const status = String(b.status || '').toLowerCase();
            const markedBy = String(b.markedBy || '').toLowerCase();
            const isConsulted =
                status === 'completed' ||
                markedBy === 'completed' ||
                String(apt?.status || '').toLowerCase() === 'completed';

            return {
                ...b,
                doctorName,
                appointmentDate,
                consultationDate,
                isConsulted,
            };
        })
        .sort((a, b) => new Date(b.consultationDate || 0) - new Date(a.consultationDate || 0));

    const consultedHistory = consultationHistory.filter((x) => x.isConsulted);
    const lastConsultation = consultedHistory[0] || consultationHistory[0] || null;

    const activeMeds = medications.filter((m) => m.isActive);
    const endedMeds = medications.filter((m) => !m.isActive || (m.endDate && new Date(m.endDate) < new Date()));

    const recoverySummary = {
        totalSymptomsLogged: symptoms.length,
        latestSeverity: symptoms[0]?.aiResult?.severity || 'unknown',
        activeMedicationCount: activeMeds.length,
        completedMedicationCount: endedMeds.length,
        totalConsultations: consultationHistory.length,
        lastConsultedDoctor: lastConsultation?.doctorName || 'Not available',
        lastConsultationDate: lastConsultation?.consultationDate || null,
    };

    return {
        records,
        uploadedFiles,
        uploadedPdfs,
        bloodTests: bloodTestRecords,
        prescriptions: prescriptionRecords,
        prescriptionPdfs,
        prescribedMedicines: allPrescribedMedicines,
        symptoms,
        medications,
        consultations: consultationHistory,
        recoverySummary,
    };
};

module.exports = {
    createRecord,
    getAllRecords,
    getRecords,
    getRecordById,
    deleteRecord,
    getPatientFullReport,
};
