const Appointment = require('./appointment.model');
const Booking = require('./booking.model');
const Doctor = require('../auth/doctor.model');
const Patient = require('../auth/patient.model');
const HealthRecord = require('../records/record.model');
const Medication = require('../medication/models/medication.model');
const medicationService = require('../medication/services/medication.service');
const ReminderLog = require('../medication/models/reminderLog.model');
const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');
const { extractMedicalDataFromText, normalizeMedicineMap } = require('../../config/grok');
const { AppError } = require('../../shared/middleware/error.middleware');

const ACTIVE_QUEUE_BOOKING_STATUS = 'confirmed';
const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toNumberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const asDayRange = (value) => {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);
    const end = new Date(value);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
};

const summarizeText = (text = '') => {
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const sentences = clean
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 4);
    return sentences.join(' ');
};

const MEDICINE_STOP_WORDS = new Set([
    'tab', 'tablet', 'tabs', 'cap', 'capsule', 'caps', 'syp', 'syrup', 'inj', 'injection',
    'drop', 'drops', 'ointment', 'cream', 'gel', 'od', 'bd', 'tds', 'hs', 'sos', 'prn',
    'daily', 'morning', 'night', 'noon', 'before', 'after', 'food', 'empty', 'stomach',
    'mg', 'mcg', 'ml', 'gm', 'g', 'rx', 'dr', 'doctor', 'patient',
]);

const sanitizeMedicineName = (value = '') => {
    let name = String(value || '').trim();
    if (!name) return '';

    name = name
        .replace(/^[\d\s).:-]+/, '')
        .replace(/[|,;]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    name = name
        .replace(/^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|drops?|ointment|cream|gel)\.?\s+/i, '')
        .replace(/\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|gm|ml)\b.*$/i, '')
        .replace(/\s+(?:od|bd|tds|hs|sos|prn|daily|once\s+daily|twice\s+daily|thrice\s+daily).*$/i, '')
        .trim();

    if (!name) return '';

    const lower = name.toLowerCase();
    if (MEDICINE_STOP_WORDS.has(lower)) return '';
    if (name.length < 3) return '';
    if (!/[a-z]/i.test(name)) return '';
    if (/^\d+$/.test(name)) return '';

    return name;
};

const uniqueSanitizedMedicines = (items = []) => {
    const seen = new Set();
    const cleaned = [];

    for (const raw of items) {
        const name = sanitizeMedicineName(raw);
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cleaned.push(name);
    }

    return cleaned;
};

const extractMedicineNamesFromText = (text = '') => {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const candidates = [];
    const medicineRegex = /\b([A-Z][A-Za-z0-9\-]{2,})\b(?:\s+\d{1,4}\s?(?:mg|mcg|g|ml))?/gi;

    for (const line of lines) {
        const hasRxHint = /\b(tab|tablet|cap|capsule|syrup|inj|injection|drop|ointment|od|bd|tds|hs|sos|daily)\b/i.test(line);
        if (!hasRxHint) continue;
        const matches = [...line.matchAll(medicineRegex)].map((m) => String(m[1] || '').trim()).filter(Boolean);
        candidates.push(...matches);
    }

    return uniqueSanitizedMedicines(candidates);
};

const resolveDoctorDisplayName = async (doctorId, fallbackName = '') => {
    const fallback = String(fallbackName || '').trim();
    if (!doctorId) return fallback;

    const doctor = await Doctor.findById(doctorId).select('name').lean();
    if (doctor?.name) return String(doctor.name).trim();

    const legacyDoctor = await Patient.findById(doctorId).select('name').lean();
    if (legacyDoctor?.name) return String(legacyDoctor.name).trim();

    return fallback;
};

const getPdfTextFromFileUrl = async (fileUrl = '') => {
    const normalizedUrl = String(fileUrl || '').trim();
    if (!normalizedUrl || !normalizedUrl.toLowerCase().endsWith('.pdf')) return '';

    const fileName = path.basename(normalizedUrl);
    if (!fileName) return '';

    try {
        const fileBuffer = await fs.readFile(path.join(UPLOADS_DIR, fileName));
        const parsed = await pdfParse(fileBuffer);
        return String(parsed?.text || '').trim();
    } catch (_error) {
        return '';
    }
};

const buildDoctorPrescriptionInsights = async ({
    prescription = '',
    prescriptionFileUrl = '',
    prescriptionOcrText = '',
    medicines = [],
}) => {
    const normalizedMedicines = uniqueSanitizedMedicines(Array.isArray(medicines) ? medicines : []);

    const providedOcrText = String(prescriptionOcrText || '').trim();
    const ocrText = providedOcrText || await getPdfTextFromFileUrl(prescriptionFileUrl);
    const sourceText = [String(prescription || '').trim(), ocrText].filter(Boolean).join('\n').trim();

    if (!sourceText) {
        return {
            ocrText,
            summary: '',
            medicines: normalizedMedicines,
        };
    }

    let aiSummary = '';
    let aiMedicineNames = [];

    try {
        const aiExtraction = await extractMedicalDataFromText(sourceText);
        aiSummary = String(aiExtraction?.summary || '').trim();
        aiMedicineNames = normalizeMedicineMap(aiExtraction?.medicineMap)
            .map((item) => String(item?.name || '').trim())
            .filter(Boolean);
    } catch (_error) {
        aiSummary = '';
        aiMedicineNames = [];
    }

    const localMedicineNames = extractMedicineNamesFromText(sourceText);

    const mergedMedicines = uniqueSanitizedMedicines([
        ...normalizedMedicines,
        ...aiMedicineNames,
        ...localMedicineNames,
    ]);

    return {
        ocrText,
        summary: aiSummary || summarizeText(sourceText),
        medicines: mergedMedicines,
    };
};

const getDoctorIdValue = (doctorRef) => {
    if (!doctorRef) return null;
    if (typeof doctorRef === 'object' && doctorRef._id) return doctorRef._id;
    return doctorRef;
};

const resolveAppointmentDoctorName = async (appointment) => {
    if (!appointment) return appointment;

    const populatedName = appointment?.doctorId?.name;
    if (populatedName) {
        appointment.doctorName = populatedName;
        return appointment;
    }

    if (appointment.doctorName) {
        return appointment;
    }

    let doctorId = getDoctorIdValue(appointment.doctorId);

    if (!doctorId && appointment._id) {
        const sourceAppointment = await Appointment.findById(appointment._id)
            .select('doctorId doctorName')
            .lean();

        if (sourceAppointment?.doctorName) {
            appointment.doctorName = sourceAppointment.doctorName;
            return appointment;
        }

        doctorId = getDoctorIdValue(sourceAppointment?.doctorId);
    }

    if (!doctorId) {
        return appointment;
    }

    let doctorName = null;

    const doctor = await Doctor.findById(doctorId).select('name');
    if (doctor?.name) {
        doctorName = doctor.name;
    } else {
        const legacyDoctor = await Patient.findById(doctorId).select('name role');
        if (legacyDoctor?.name) {
            doctorName = legacyDoctor.name;
        }
    }

    if (doctorName) {
        appointment.doctorName = doctorName;
        if (typeof appointment.save === 'function') {
            await appointment.save();
        }
    }

    return appointment;
};

const resolveAppointmentsDoctorNames = async (appointments = []) => {
    await Promise.all(appointments.map((appointment) => resolveAppointmentDoctorName(appointment)));
    return appointments;
};

const getDoctorRatingStats = (doctor) => {
    const reviews = Array.isArray(doctor?.ratingReviews)
        ? doctor.ratingReviews.filter((item) => {
            const rating = Number(item?.rating);
            return Number.isFinite(rating) && rating >= 1 && rating <= 5;
        })
        : [];

    if (reviews.length > 0) {
        const total = reviews.reduce((sum, item) => sum + Number(item.rating), 0);
        const avg = Number((total / reviews.length).toFixed(2));
        return { rating: avg, ratingCount: reviews.length };
    }

    const fallbackRating = Number(doctor?.rating || 0);
    const fallbackCount = Number(doctor?.ratingCount || 0);
    return {
        rating: Number.isFinite(fallbackRating) ? fallbackRating : 0,
        ratingCount: Number.isFinite(fallbackCount) ? fallbackCount : 0,
    };
};

const applyDoctorRatingStats = (doctor) => {
    if (!doctor) return doctor;
    const stats = getDoctorRatingStats(doctor);
    doctor.rating = stats.rating;
    doctor.ratingCount = stats.ratingCount;
    return doctor;
};

const enrichAppointmentsWithDoctorRatings = (appointments = []) => {
    appointments.forEach((appointment) => {
        if (appointment?.doctorId) {
            applyDoctorRatingStats(appointment.doctorId);
        }
    });
    return appointments;
};

const compareDoctorRatingDesc = (a, b) => {
    const aRating = Number(a?.doctorId?.rating || 0);
    const bRating = Number(b?.doctorId?.rating || 0);
    if (bRating !== aRating) return bRating - aRating;

    const aCount = Number(a?.doctorId?.ratingCount || 0);
    const bCount = Number(b?.doctorId?.ratingCount || 0);
    if (bCount !== aCount) return bCount - aCount;

    const aDate = new Date(a?.appointmentDate || 0).getTime();
    const bDate = new Date(b?.appointmentDate || 0).getTime();
    if (aDate !== bDate) return aDate - bDate;

    return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
};

const applyDoctorSearchToQuery = async (query, doctorSearch) => {
    const text = String(doctorSearch || '').trim();
    if (!text) return;

    const regex = new RegExp(escapeRegExp(text), 'i');
    const matchedDoctors = await Doctor.find({
        $or: [{ name: regex }, { email: regex }],
    })
        .select('_id')
        .lean();

    const doctorIds = matchedDoctors.map((doc) => doc._id);

    if (doctorIds.length > 0) {
        query.$or = [
            { doctorId: { $in: doctorIds } },
            { doctorName: regex },
        ];
        return;
    }

    // Fallback for records that only store doctorName snapshot.
    query.doctorName = regex;
};

const recalculateDoctorRating = async (doctorId) => {
    if (!doctorId) return;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return;
    const { rating, ratingCount } = getDoctorRatingStats(doctor);
    doctor.rating = rating;
    doctor.ratingCount = ratingCount;
    await doctor.save();
};

const recalculateQueueForAppointment = async (appointmentId, io) => {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        return null;
    }

    const queuedBookings = await Booking.find({
        appointmentId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    }).sort({ tokenNumber: 1, createdAt: 1 });

    const now = new Date();
    const duration = appointment.consultationDurationMinutes || 10;

    if (queuedBookings.length > 0) {
        const bulkOps = queuedBookings.map((booking, index) => ({
            updateOne: {
                filter: { _id: booking._id },
                update: {
                    estimatedWaitMinutes: index * duration,
                    estimatedTurnTime: new Date(now.getTime() + index * duration * 60000),
                },
            },
        }));

        await Booking.bulkWrite(bulkOps);
    }

    appointment.currentTokenNumber = queuedBookings[0]?.tokenNumber ?? null;
    await appointment.save();

    const refreshedQueue = await Booking.find({
        appointmentId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    })
        .select('tokenNumber patientName status estimatedTurnTime estimatedWaitMinutes isOfflineEntry')
        .sort({ tokenNumber: 1, createdAt: 1 });

    const payload = {
        appointmentId: appointment._id,
        currentTokenNumber: appointment.currentTokenNumber,
        consultationDurationMinutes: appointment.consultationDurationMinutes,
        queue: refreshedQueue,
    };

    if (io) {
        io.to(`appointment-${appointment._id}`).emit('queue-updated', payload);
        io.to(`doctor-${appointment.doctorId}`).emit('queue-updated', payload);
    }

    return payload;
};

// ========== DOCTOR SERVICES ==========

// Create a new appointment session
const createAppointment = async (doctorId, appointmentData, creatorName) => {
    const {  
        title,
        specialization,
        appointmentDate,
        consultationDurationMinutes,
        scheduleStartTime,
        price,
        address,
        locationLatitude,
        locationLongitude
    } = appointmentData;

    if (!consultationDurationMinutes) {
        throw new AppError('Consultation duration is required', 400);
    }

    const doctor = await Doctor.findById(doctorId).select('name');
    const fallbackDoctor = !doctor?.name ? await Patient.findById(doctorId).select('name role') : null;
    const resolvedDoctorName = doctor?.name || fallbackDoctor?.name || creatorName || null;

    const latitude = toNumberOrNull(locationLatitude);
    const longitude = toNumberOrNull(locationLongitude);
    const location =
        latitude !== null &&
        longitude !== null &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
            ? {
                type: 'Point',
                coordinates: [longitude, latitude],
            }
            : undefined;

    const appointment = await Appointment.create({
        doctorId,
        doctorName: resolvedDoctorName,
        title,
        specialization,
        appointmentDate,
        consultationDurationMinutes: Number(consultationDurationMinutes),
        scheduleStartTime: scheduleStartTime || '09:00',
        price,
        address,
        location,
        totalTokensIssued: 0,
        currentTokenNumber: null,
    });

    return appointment;
};

// Get doctor's appointments (for doctor dashboard)
const getDoctorAppointments = async (doctorId, date) => {
    const doctor = await Doctor.findById(doctorId).select('name').lean();
    const fallbackDoctor = !doctor?.name ? await Patient.findById(doctorId).select('name').lean() : null;
    const resolvedDoctorName = String(doctor?.name || fallbackDoctor?.name || '').trim();

    const query = {
        $or: [
            { doctorId },
            ...(resolvedDoctorName ? [{ doctorName: { $regex: `^${escapeRegExp(resolvedDoctorName)}$`, $options: 'i' } }] : []),
        ],
    };
    
    if (date) {
        query.appointmentDate = asDayRange(date);
    }

    // If no date filter, sort by latest first. If date filter, sort by date ascending
    const sortOrder = date ? { appointmentDate: 1, createdAt: -1 } : { appointmentDate: -1, createdAt: -1 };

    return Appointment.find(query).sort(sortOrder);
};

const getDoctorAnalytics = async (doctorId, days = 14) => {
    const parsedDays = Number(days);
    const windowDays = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(Math.floor(parsedDays), 90) : 14;

    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (windowDays - 1));

    const appointmentIds = await Appointment.find({ doctorId }).distinct('_id');

    const rawBookings = appointmentIds.length
        ? await Booking.aggregate([
            {
                $match: {
                    appointmentId: { $in: appointmentIds },
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $project: {
                    day: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                            timezone: 'Asia/Kolkata',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: '$day',
                    bookings: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ])
        : [];

    const rawCompleted = appointmentIds.length
        ? await Booking.aggregate([
            {
                $match: {
                    appointmentId: { $in: appointmentIds },
                    updatedAt: { $gte: start, $lte: end },
                    $or: [
                        { status: 'completed' },
                        { markedBy: 'completed' },
                    ],
                },
            },
            {
                $project: {
                    day: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$updatedAt',
                            timezone: 'Asia/Kolkata',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: '$day',
                    completed: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ])
        : [];

    const rawCancelled = appointmentIds.length
        ? await Booking.aggregate([
            {
                $match: {
                    appointmentId: { $in: appointmentIds },
                    updatedAt: { $gte: start, $lte: end },
                    $or: [
                        { status: 'cancelled' },
                        { markedBy: 'absent' },
                    ],
                },
            },
            {
                $project: {
                    day: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$updatedAt',
                            timezone: 'Asia/Kolkata',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: '$day',
                    cancelled: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ])
        : [];

    const bookingsMap = new Map(rawBookings.map((item) => [String(item._id), Number(item.bookings || 0)]));
    const completedMap = new Map(rawCompleted.map((item) => [String(item._id), Number(item.completed || 0)]));
    const cancelledMap = new Map(rawCancelled.map((item) => [String(item._id), Number(item.cancelled || 0)]));

    const dailyBookings = [];
    for (let i = 0; i < windowDays; i += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const key = day.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        dailyBookings.push({
            date: key,
            label: day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            bookings: bookingsMap.get(key) || 0,
            completed: completedMap.get(key) || 0,
            cancelled: cancelledMap.get(key) || 0,
        });
    }

    const totals = dailyBookings.reduce((acc, row) => {
        acc.bookings += row.bookings;
        acc.completed += row.completed;
        acc.cancelled += row.cancelled;
        return acc;
    }, { bookings: 0, completed: 0, cancelled: 0 });

    return {
        days: windowDays,
        totalBookingsInWindow: totals.bookings,
        totalCompletedInWindow: totals.completed,
        totalCancelledInWindow: totals.cancelled,
        dailyBookings,
    };
};

// Get all bookings for doctor's appointments
const getDoctorBookings = async (doctorId, date) => {
    const doctor = await Doctor.findById(doctorId).select('name').lean();
    const fallbackDoctor = !doctor?.name ? await Patient.findById(doctorId).select('name').lean() : null;
    const resolvedDoctorName = String(doctor?.name || fallbackDoctor?.name || '').trim();

    const appointmentQuery = {
        $or: [
            { doctorId },
            ...(resolvedDoctorName ? [{ doctorName: { $regex: `^${escapeRegExp(resolvedDoctorName)}$`, $options: 'i' } }] : []),
        ],
    };
    if (date) {
        appointmentQuery.appointmentDate = asDayRange(date);
    }

    const appointmentIds = await Appointment.find(appointmentQuery).distinct('_id');
    if (!appointmentIds.length) return [];

    return Booking.find({ appointmentId: { $in: appointmentIds } })
        .populate('appointmentId', 'title specialization appointmentDate doctorName')
        .populate('patientId', 'name email phone')
        .sort({ createdAt: -1, updatedAt: -1 });
};

const getDoctorPatientDetails = async (doctorId, patientId) => {
    const patient = await Patient.findById(patientId).select('name email phone role').lean();
    if (!patient) {
        throw new AppError('Patient not found', 404);
    }

    const doctorAppointmentIds = await Appointment.find({ doctorId }).distinct('_id');
    if (!doctorAppointmentIds.length) {
        throw new AppError('Patient not found in your consulted list', 404);
    }

    const bookings = await Booking.find({
        patientId,
        appointmentId: { $in: doctorAppointmentIds },
    })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

    const consultedBookings = bookings.filter((booking) => {
        const status = String(booking?.status || '').toLowerCase();
        const markedBy = String(booking?.markedBy || '').toLowerCase();
        return status === 'completed' || markedBy === 'completed';
    });

    if (!consultedBookings.length) {
        throw new AppError('Patient not found in your consulted list', 404);
    }

    const appointmentIds = [...new Set(bookings.map((item) => String(item.appointmentId)).filter(Boolean))];
    const appointments = await Appointment.find({ _id: { $in: appointmentIds }, doctorId })
        .select('title specialization appointmentDate address consultationDurationMinutes price scheduleStartTime')
        .lean();
    const appointmentMap = new Map(appointments.map((item) => [String(item._id), item]));

    const doctorBookings = bookings.map((booking) => {
        const appointment = appointmentMap.get(String(booking.appointmentId));
        return {
            _id: booking._id,
            appointmentId: booking.appointmentId,
            appointmentTitle: appointment?.title || '',
            specialization: appointment?.specialization || '',
            appointmentDate: appointment?.appointmentDate || null,
            address: appointment?.address || '',
            consultationDurationMinutes: appointment?.consultationDurationMinutes || null,
            tokenNumber: booking.tokenNumber,
            status: booking.status,
            markedBy: booking.markedBy,
            description: booking.description || '',
            patientReview: booking.patientReview || null,
            consultedAt: booking.updatedAt || booking.createdAt || null,
        };
    });

    const records = await HealthRecord.find({
        userId: patientId,
        createdByDoctorId: doctorId,
    })
        .sort({ createdAt: -1 })
        .lean();

    const medications = await Medication.find({
        userId: patientId,
        prescribedByDoctorId: doctorId,
    })
        .sort({ createdAt: -1 })
        .lean();

    const medicationIds = medications.map((item) => item._id);
    const logs = medicationIds.length
        ? await ReminderLog.find({
            medicationId: { $in: medicationIds },
            userId: patientId,
        }).lean()
        : [];

    const logStatsByMedication = new Map();
    logs.forEach((log) => {
        const key = String(log.medicationId);
        if (!logStatsByMedication.has(key)) {
            logStatsByMedication.set(key, {
                total: 0,
                taken: 0,
                skipped: 0,
                missed: 0,
                pending: 0,
                lastScheduledAt: null,
                lastStatus: null,
            });
        }

        const stats = logStatsByMedication.get(key);
        stats.total += 1;
        const status = String(log.status || 'pending').toLowerCase();
        if (status === 'taken') stats.taken += 1;
        else if (status === 'skipped') stats.skipped += 1;
        else if (status === 'missed') stats.missed += 1;
        else stats.pending += 1;

        const currentTs = new Date(log.scheduledAt || 0).getTime();
        const prevTs = new Date(stats.lastScheduledAt || 0).getTime();
        if (currentTs >= prevTs) {
            stats.lastScheduledAt = log.scheduledAt || null;
            stats.lastStatus = status;
        }
    });

    const medicationTracking = medications.map((med) => {
        const stats = logStatsByMedication.get(String(med._id)) || {
            total: 0,
            taken: 0,
            skipped: 0,
            missed: 0,
            pending: 0,
            lastScheduledAt: null,
            lastStatus: null,
        };
        const adherenceRate = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
        return {
            _id: med._id,
            medicineName: med.medicineName,
            dosage: med.dosage || '',
            scheduleTimes: med.scheduleTimes || [],
            startDate: med.startDate || null,
            endDate: med.endDate || null,
            isActive: !!med.isActive,
            adherence: {
                ...stats,
                adherenceRate,
            },
        };
    });

    const totals = medicationTracking.reduce(
        (acc, med) => {
            acc.total += med.adherence.total;
            acc.taken += med.adherence.taken;
            acc.skipped += med.adherence.skipped;
            acc.missed += med.adherence.missed;
            acc.pending += med.adherence.pending;
            return acc;
        },
        { total: 0, taken: 0, skipped: 0, missed: 0, pending: 0 }
    );

    return {
        patient: {
            _id: patient._id,
            name: patient.name,
            email: patient.email,
            phone: patient.phone,
        },
        summary: {
            totalConsultations: consultedBookings.length,
            totalBookings: doctorBookings.length,
            recordsCount: records.length,
            medicationsCount: medicationTracking.length,
            adherence: {
                ...totals,
                adherenceRate: totals.total > 0 ? Math.round((totals.taken / totals.total) * 100) : 0,
            },
        },
        bookings: doctorBookings,
        records,
        medications: medicationTracking,
    };
};

// Get all consulted patients for doctor CRM
const getDoctorConsultedPatients = async (doctorId, filters = {}) => {
    const bookings = await Booking.find({
        $or: [{ status: 'completed' }, { markedBy: 'completed' }],
    })
        .populate({
            path: 'appointmentId',
            select: 'doctorId title specialization appointmentDate',
            match: { doctorId },
        })
        .populate('patientId', 'name email phone')
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

    const consultedBookings = bookings.filter((booking) => booking.appointmentId);
    const byPatient = new Map();

    consultedBookings.forEach((booking) => {
        const patientIdValue = booking?.patientId?._id ? String(booking.patientId._id) : null;
        const phone = String(booking.patientId?.phone || booking.patientPhone || '').trim();
        const name = String(booking.patientId?.name || booking.patientName || 'Unknown patient').trim();
        const key = patientIdValue || `offline:${phone || name.toLowerCase()}`;
        const consultedAt = booking?.updatedAt || booking?.createdAt || new Date(0);

        const nextRow = {
            key,
            patientId: patientIdValue,
            name,
            email: booking.patientId?.email || '',
            phone,
            gender: booking.patientGender || '',
            age: booking.patientAge || null,
            totalConsultations: 1,
            lastConsultedAt: consultedAt,
            lastAppointmentTitle: booking.appointmentId?.title || '',
            specialization: booking.appointmentId?.specialization || '',
            lastReviewRating: Number(booking?.patientReview?.rating) || 0,
            lastReviewComment: booking?.patientReview?.comment || '',
        };

        if (!byPatient.has(key)) {
            byPatient.set(key, nextRow);
            return;
        }

        const current = byPatient.get(key);
        current.totalConsultations += 1;

        if (new Date(consultedAt).getTime() > new Date(current.lastConsultedAt).getTime()) {
            current.name = nextRow.name || current.name;
            current.email = nextRow.email || current.email;
            current.phone = nextRow.phone || current.phone;
            current.gender = nextRow.gender || current.gender;
            current.age = nextRow.age || current.age;
            current.lastConsultedAt = nextRow.lastConsultedAt;
            current.lastAppointmentTitle = nextRow.lastAppointmentTitle;
            current.specialization = nextRow.specialization;
            current.lastReviewRating = nextRow.lastReviewRating;
            current.lastReviewComment = nextRow.lastReviewComment;
        }
    });

    let patients = Array.from(byPatient.values()).sort(
        (a, b) => new Date(b.lastConsultedAt).getTime() - new Date(a.lastConsultedAt).getTime()
    );

    const search = String(filters.search || '').trim().toLowerCase();
    if (search) {
        patients = patients.filter((row) => {
            const haystack = `${row.name} ${row.email} ${row.phone}`.toLowerCase();
            return haystack.includes(search);
        });
    }

    return {
        summary: {
            totalUniquePatients: patients.length,
            totalConsultations: consultedBookings.length,
        },
        patients,
    };
};

// Get appointment details with patient bookings
const getAppointmentDetails = async (appointmentId, doctorId) => {
    const appointment = await Appointment.findOne({ 
        _id: appointmentId,
        doctorId 
    });

    if (!appointment) {
        throw new Error('Appointment not found');
    }

    await recalculateQueueForAppointment(appointmentId);

    const refreshedAppointment = await Appointment.findOne({ 
        _id: appointmentId,
        doctorId 
    });

    const bookings = await Booking.find({ appointmentId })
        .populate('patientId', 'name email phone')
        .sort({ tokenNumber: 1, createdAt: 1 });

    return {
        appointment: refreshedAppointment,
        bookings
    };
};

const createPatientMedicationsFromDoctorPrescription = async ({ booking, medicines = [], doctorId, doctorName }) => {
    if (!booking?.patientId || !Array.isArray(medicines) || medicines.length === 0) return;

    const normalizedMedicines = uniqueSanitizedMedicines(medicines);
    if (!normalizedMedicines.length) return;

    const startDate = new Date();

    for (const medicineName of normalizedMedicines) {
        const existingActive = await Medication.findOne({
            userId: booking.patientId,
            isActive: true,
            medicineName,
            prescribedByDoctorId: doctorId,
        }).lean();
        if (existingActive) continue;

        await medicationService.createMedication(booking.patientId, {
            medicineName,
            dosage: '',
            scheduleTimes: ['09:00'],
            startDate,
            prescribedByDoctorId: doctorId,
            prescribedByDoctorName: doctorName || '',
        });
    }
};

// Mark patient attendance/completion
const markPatient = async (bookingId, doctorId, markStatus, treatmentData = {}, io) => {
    const booking = await Booking.findById(bookingId).populate('appointmentId');
    
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (booking.appointmentId.doctorId.toString() !== doctorId.toString()) {
        throw new AppError('Unauthorized', 403);
    }

    booking.markedBy = markStatus;
    if (markStatus === 'completed') {
        const prescription = typeof treatmentData.prescription === 'string'
            ? treatmentData.prescription.trim()
            : '';
        const prescriptionFileUrl = typeof treatmentData.prescriptionFileUrl === 'string'
            ? treatmentData.prescriptionFileUrl.trim()
            : '';
        const prescriptionOcrText = typeof treatmentData.prescriptionOcrText === 'string'
            ? treatmentData.prescriptionOcrText.trim()
            : '';
        const manualMedicines = Array.isArray(treatmentData.medicines)
            ? treatmentData.medicines
                .map((item) => String(item || '').trim())
                .filter(Boolean)
            : [];

        if (!prescription && !prescriptionFileUrl && manualMedicines.length === 0) {
            throw new AppError('Upload prescription file, add notes, or add at least one medicine before completing consultation', 400);
        }

        const prescriptionInsights = await buildDoctorPrescriptionInsights({
            prescription,
            prescriptionFileUrl,
            prescriptionOcrText,
            medicines: manualMedicines,
        });

        booking.status = 'completed';
        booking.estimatedTurnTime = null;
        booking.estimatedWaitMinutes = null;
        booking.doctorPrescription = prescription;
        booking.doctorPrescriptionFileUrl = prescriptionFileUrl;
        booking.doctorPrescriptionOcrText = prescriptionInsights.ocrText || '';
        booking.doctorPrescriptionSummary = prescriptionInsights.summary || '';
        booking.prescribedMedicines = prescriptionInsights.medicines;

        const appointmentDoctorNameSnapshot = String(
            booking?.appointmentId?.doctorName ||
            booking?.appointmentId?.doctorId?.name ||
            ''
        ).trim();
        const appointmentDoctorName = await resolveDoctorDisplayName(doctorId, appointmentDoctorNameSnapshot);

        await createPatientMedicationsFromDoctorPrescription({
            booking,
            medicines: prescriptionInsights.medicines,
            doctorId,
            doctorName: appointmentDoctorName,
        });
    }

    if (markStatus === 'absent') {
        booking.status = 'cancelled';
        booking.estimatedTurnTime = null;
        booking.estimatedWaitMinutes = null;
    }
    
    await booking.save();

    if (io) {
        io.to(`appointment-${booking.appointmentId._id}`).emit('booking-status-updated', {
            appointmentId: booking.appointmentId._id.toString(),
            bookingId: booking._id.toString(),
            tokenNumber: booking.tokenNumber,
            status: booking.status,
            markedBy: booking.markedBy,
            doctorPrescription: booking.doctorPrescription,
            doctorPrescriptionFileUrl: booking.doctorPrescriptionFileUrl,
            doctorPrescriptionSummary: booking.doctorPrescriptionSummary,
            prescribedMedicines: booking.prescribedMedicines,
        });
    }

    await recalculateQueueForAppointment(booking.appointmentId._id, io);
    return booking;
};

const addOfflinePatientToQueue = async (appointmentId, doctorId, data, io) => {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    if (appointment.doctorId.toString() !== doctorId.toString()) {
        throw new AppError('Unauthorized', 403);
    }

    const lastBooking = await Booking.findOne({ appointmentId }).sort({ tokenNumber: -1 });
    const tokenNumber = (lastBooking?.tokenNumber || 0) + 1;

    const booking = await Booking.create({
        appointmentId,
        patientId: null,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
        description: data.description,
        tokenNumber,
        isOfflineEntry: true,
    });

    appointment.totalTokensIssued = Math.max(appointment.totalTokensIssued || 0, tokenNumber);
    await appointment.save();

    await recalculateQueueForAppointment(appointmentId, io);

    return booking;
};

// ========== PATIENT SERVICES ==========

// Get all appointments (for patient to browse)
const getAllAppointments = async (filters = {}) => {
    const query = { status: 'active' };

    if (filters.doctorId) {
        query.doctorId = filters.doctorId;
    }
    
    // Filter by specialization
    if (filters.specialization) {
        query.specialization = filters.specialization;
    }

    // Filter by date range
    if (filters.fromDate) {
        query.appointmentDate = { $gte: new Date(filters.fromDate) };
    }

    if (filters.date) {
        query.appointmentDate = asDayRange(filters.date);
    }

    await applyDoctorSearchToQuery(query, filters.doctorSearch);

    const appointments = await Appointment.find(query)
        .populate('doctorId', 'name email specialization clinicAddress rating ratingCount ratingReviews')
        .sort({ appointmentDate: 1, createdAt: 1 });

    await resolveAppointmentsDoctorNames(appointments);
    enrichAppointmentsWithDoctorRatings(appointments);
    return appointments.sort(compareDoctorRatingDesc);
};

const getNearbyAppointments = async (filters = {}) => {
    const latitude = toNumberOrNull(filters.latitude);
    const longitude = toNumberOrNull(filters.longitude);
    const distanceKm = toNumberOrNull(filters.distanceKm) || 5;

    if (latitude === null || longitude === null) {
        throw new AppError('Latitude and longitude are required for nearby search', 400);
    }

    if (distanceKm <= 0) {
        throw new AppError('Distance must be greater than 0', 400);
    }

    const geoQuery = {
        status: 'active',
        'location.coordinates.0': { $exists: true },
        'location.coordinates.1': { $exists: true },
    };

    if (filters.specialization) {
        geoQuery.specialization = filters.specialization;
    }

    if (filters.fromDate) {
        geoQuery.appointmentDate = { $gte: new Date(filters.fromDate) };
    }

    if (filters.date) {
        geoQuery.appointmentDate = asDayRange(filters.date);
    }

    await applyDoctorSearchToQuery(geoQuery, filters.doctorSearch);

    const maxDistance = distanceKm * 1000;

    const nearbyAppointments = await Appointment.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                distanceField: 'distanceMeters',
                spherical: true,
                maxDistance,
                query: geoQuery,
            },
        },
        {
            $sort: {
                distanceMeters: 1,
                appointmentDate: 1,
                createdAt: -1,
            },
        },
    ]);

    const mapped = nearbyAppointments.map((appointment) => ({
        ...appointment,
        distanceKm: Number((appointment.distanceMeters / 1000).toFixed(2)),
    }));

    const doctorIds = [...new Set(mapped.map((item) => item.doctorId).filter(Boolean).map((id) => String(id)))];
    if (doctorIds.length > 0) {
        const doctors = await Doctor.find({ _id: { $in: doctorIds } })
            .select('_id rating ratingCount ratingReviews')
            .lean();

        const ratingMap = new Map(
            doctors.map((doc) => {
                const stats = getDoctorRatingStats(doc);
                return [String(doc._id), stats];
            })
        );

        mapped.forEach((item) => {
            const stats = ratingMap.get(String(item.doctorId));
            if (stats) {
                item.doctorRating = stats.rating;
                item.doctorRatingCount = stats.ratingCount;
            } else {
                item.doctorRating = 0;
                item.doctorRatingCount = 0;
            }
        });
    }

    return mapped.sort((a, b) => {
        const ratingDiff = Number(b.doctorRating || 0) - Number(a.doctorRating || 0);
        if (ratingDiff !== 0) return ratingDiff;

        const countDiff = Number(b.doctorRatingCount || 0) - Number(a.doctorRatingCount || 0);
        if (countDiff !== 0) return countDiff;

        return Number(a.distanceMeters || 0) - Number(b.distanceMeters || 0);
    });
};

// Get appointment queue details
const getAppointmentWithSlots = async (appointmentId) => {
    const appointment = await Appointment.findById(appointmentId)
        .populate('doctorId', 'name email phone specialization clinicAddress rating ratingCount ratingReviews');

    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    await recalculateQueueForAppointment(appointmentId);

    const refreshedAppointment = await Appointment.findById(appointmentId)
        .populate('doctorId', 'name email phone specialization clinicAddress rating ratingCount ratingReviews');

    await resolveAppointmentDoctorName(refreshedAppointment);
    if (refreshedAppointment?.doctorId) {
        applyDoctorRatingStats(refreshedAppointment.doctorId);
    }

    const queue = await Booking.find({
        appointmentId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    })
        .select('tokenNumber patientName status estimatedTurnTime estimatedWaitMinutes isOfflineEntry')
        .sort({ tokenNumber: 1, createdAt: 1 });

    return {
        ...refreshedAppointment.toObject(),
        queue,
    };
};

// Book into appointment queue
const bookSlot = async (patientId, bookingData, io) => {
    const {
        appointmentId,
        patientName,
        patientPhone,
        patientAge,
        patientGender,
        description
    } = bookingData;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    if (appointment.status !== 'active') {
        throw new AppError('Appointment is not active', 400);
    }

    const existing = await Booking.findOne({
        appointmentId,
        patientId,
        status: ACTIVE_QUEUE_BOOKING_STATUS,
    });

    if (existing) {
        throw new AppError('You already have an active token for this appointment', 400);
    }

    const lastBooking = await Booking.findOne({ appointmentId }).sort({ tokenNumber: -1 });
    const tokenNumber = (lastBooking?.tokenNumber || 0) + 1;

    // Create booking
    const booking = await Booking.create({
        appointmentId,
        patientId,
        tokenNumber,
        patientName,
        patientPhone,
        patientAge,
        patientGender,
        description,
        isOfflineEntry: false,
    });

    appointment.totalTokensIssued = Math.max(appointment.totalTokensIssued || 0, tokenNumber);
    await appointment.save();

    const queueState = await recalculateQueueForAppointment(appointmentId, io);

    // Emit real-time update
    if (io) {
        io.to(`doctor-${appointment.doctorId}`).emit('new-booking', {
            appointmentId,
            booking
        });
    }

    return {
        ...booking.toObject(),
        currentTokenNumber: queueState?.currentTokenNumber ?? null,
    };
};

// Get patient's bookings
const getPatientBookings = async (patientId) => {
    const bookings = await Booking.find({ patientId })
        .populate({
            path: 'appointmentId',
            populate: { path: 'doctorId', select: 'name email specialization clinicAddress rating ratingCount ratingReviews' }
        })
        .sort({ createdAt: -1 });

    await Promise.all(
        bookings
            .filter((booking) => booking.appointmentId)
            .map((booking) => resolveAppointmentDoctorName(booking.appointmentId))
    );

    bookings.forEach((booking) => {
        if (booking?.appointmentId?.doctorId) {
            applyDoctorRatingStats(booking.appointmentId.doctorId);
        }
    });

    return bookings;
};

const submitBookingReview = async (bookingId, patientId, reviewData = {}) => {
    const booking = await Booking.findById(bookingId).populate('appointmentId');

    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (!booking.patientId || booking.patientId.toString() !== patientId.toString()) {
        throw new AppError('Unauthorized review access', 403);
    }

    const isCompleted = booking.status === 'completed' || booking.markedBy === 'completed';
    if (!isCompleted) {
        throw new AppError('You can review only after appointment completion', 400);
    }

    const rating = Number(reviewData.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
    }

    const comment = String(reviewData.comment || '').trim();
    if (comment.length > 500) {
        throw new AppError('Review comment must be 500 characters or less', 400);
    }

    booking.patientReview = {
        rating,
        comment,
        reviewedAt: new Date(),
    };

    await booking.save();

    const doctorId = getDoctorIdValue(booking?.appointmentId?.doctorId);

    if (doctorId) {
        const doctor = await Doctor.findById(doctorId);
        if (doctor) {
            if (!Array.isArray(doctor.ratingReviews)) {
                doctor.ratingReviews = [];
            }

            const reviewEntry = {
                bookingId: booking._id,
                patientId,
                rating,
                comment,
                reviewedAt: new Date(),
            };

            const idx = doctor.ratingReviews.findIndex(
                (entry) => String(entry.bookingId) === String(booking._id)
            );

            if (idx >= 0) {
                doctor.ratingReviews[idx] = reviewEntry;
            } else {
                doctor.ratingReviews.push(reviewEntry);
            }

            const stats = getDoctorRatingStats(doctor);
            doctor.rating = stats.rating;
            doctor.ratingCount = stats.ratingCount;
            await doctor.save();
        }
    }

    return booking;
};

// Cancel booking
const cancelBooking = async (bookingId, patientId, io) => {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (!booking.patientId || booking.patientId.toString() !== patientId.toString()) {
        throw new AppError('Unauthorized', 403);
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.markedBy = 'absent';
    booking.estimatedTurnTime = null;
    booking.estimatedWaitMinutes = null;
    await booking.save();

    const appointment = await Appointment.findById(booking.appointmentId);
    if (!appointment) {
        return booking;
    }

    await recalculateQueueForAppointment(booking.appointmentId, io);

    // Emit real-time update
    if (io) {
        io.to(`doctor-${appointment.doctorId}`).emit('booking-cancelled', {
            appointmentId: booking.appointmentId,
            bookingId
        });
    }

    return booking;
};

// ========== DELETE SERVICES (For clearing data) ==========

// Delete all appointments
const deleteAllAppointments = async () => {
    const result = await Appointment.deleteMany({});
    return { deletedCount: result.deletedCount };
};

// Delete all bookings
const deleteAllBookings = async () => {
    const result = await Booking.deleteMany({});
    return { deletedCount: result.deletedCount };
};

// Delete specific appointment by ID
const deleteAppointmentById = async (appointmentId) => {
    const appointment = await Appointment.findByIdAndDelete(appointmentId);
    if (!appointment) {
        throw new Error('Appointment not found');
    }
    // Also delete associated bookings
    await Booking.deleteMany({ appointmentId });
    return appointment;
};

// Delete all queue data (appointments + bookings)
const clearAllQueueData = async () => {
    const appointments = await Appointment.deleteMany({});
    const bookings = await Booking.deleteMany({});
    return {
        appointmentsDeleted: appointments.deletedCount,
        bookingsDeleted: bookings.deletedCount
    };
};

module.exports = {
    // Doctor services
    createAppointment,
    getDoctorAppointments,
    getDoctorAnalytics,
    getDoctorBookings,
    getDoctorConsultedPatients,
    getDoctorPatientDetails,
    getAppointmentDetails,
    markPatient,
    addOfflinePatientToQueue,
    
    // Patient services
    getAllAppointments,
    getNearbyAppointments,
    getAppointmentWithSlots,
    bookSlot,
    getPatientBookings,
    submitBookingReview,
    cancelBooking,
    
    // Delete services
    deleteAllAppointments,
    deleteAllBookings,
    deleteAppointmentById,
    clearAllQueueData,
    recalculateQueueForAppointment,
};
