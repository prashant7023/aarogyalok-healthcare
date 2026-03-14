/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');

const HealthRecord = require('../src/modules/records/record.model');
const { extractMedicalDataFromText, normalizeMedicineMap } = require('../src/config/grok');
const medicationService = require('../src/modules/medication/services/medication.service');
const Medication = require('../src/modules/medication/models/medication.model');

const FORCE = process.argv.includes('--force');
const SYNC_MEDICATIONS = process.argv.includes('--sync-medications');

const summarizeText = (text = '') => {
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join(' ');
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

const enforceDurationInMedicineMap = (medicineMap = []) => {
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

const syncMedicationsForRecord = async (recordUserId, medicineMap = []) => {
    const startDate = new Date();

    for (const med of medicineMap) {
        const durationDays = parseDurationDays(med.duration);
        if (!durationDays) continue;

        const existingActive = await Medication.findOne({
            userId: recordUserId,
            isActive: true,
            medicineName: med.name,
            dosage: med.dosage || '',
            endDate: { $gte: startDate },
        }).lean();
        if (existingActive) continue;

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        await medicationService.createMedication(recordUserId, {
            medicineName: med.name,
            dosage: med.dosage || '',
            scheduleTimes: frequencyToScheduleTimes(med.frequency),
            startDate,
            endDate,
        });
    }
};

const parsePdfText = async (record) => {
    if ((record.fileType || '').toLowerCase() !== 'pdf' || !record.fileUrl) return '';
    const relative = record.fileUrl.replace(/^\/uploads\//, '');
    if (!relative || relative === record.fileUrl) return '';

    const fullPath = path.join(__dirname, '../uploads', relative);
    try {
        const buffer = await fs.readFile(fullPath);
        const parsed = await pdfParse(buffer);
        return (parsed?.text || '').trim();
    } catch (_error) {
        return '';
    }
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const records = await HealthRecord.find({});
    let updated = 0;

    for (const rec of records) {
        const currentText = (rec.ocrText || '').trim();
        const pdfText = currentText ? '' : await parsePdfText(rec);
        const ocrText = currentText || pdfText;

        const sourceForSummary = ocrText || (rec.description || '').trim() || (rec.title || '').trim();
        const aiExtraction = await extractMedicalDataFromText(sourceForSummary);
        const ocrSummary = (
            (FORCE ? '' : rec.ocrSummary) ||
            aiExtraction.summary ||
            summarizeText(sourceForSummary) ||
            ''
        ).trim();

        const currentMap = Array.isArray(rec.medicineMap) ? rec.medicineMap : [];
        const hasStrongCurrentMap = currentMap.some((m) => m?.dosage || m?.frequency || m?.duration);
        const parsedMap = extractMedicineMap(ocrText || rec.description || '');
        const aiMap = normalizeMedicineMap(aiExtraction.medicineMap);
                const medicineMapRaw = FORCE
            ? aiMap.length
                ? aiMap
                : parsedMap
            : hasStrongCurrentMap
              ? currentMap
              : aiMap.length
                ? aiMap
                : parsedMap;
                const medicineMap = enforceDurationInMedicineMap(medicineMapRaw);

        const dirty =
            (rec.ocrText || '') !== ocrText ||
            (rec.ocrSummary || '') !== ocrSummary ||
            JSON.stringify(currentMap) !== JSON.stringify(medicineMap);

        if (!dirty) continue;

        rec.ocrText = ocrText;
        rec.ocrSummary = ocrSummary;
        rec.medicineMap = medicineMap;
        await rec.save();

        if (SYNC_MEDICATIONS && medicineMap.length) {
            await syncMedicationsForRecord(rec.userId, medicineMap);
        }

        updated += 1;
    }

    console.log(`Backfill complete. Updated records: ${updated}/${records.length}`);
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error('Backfill failed:', err.message);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exit(1);
});
