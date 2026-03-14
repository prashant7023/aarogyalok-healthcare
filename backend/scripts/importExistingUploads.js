/* eslint-disable no-console */
require('dotenv').config();
const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');

const HealthRecord = require('../src/modules/records/record.model');
const Patient = require('../src/modules/auth/patient.model');
const recordService = require('../src/modules/records/record.service');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.pdf']);

const getArg = (name) => {
    const prefix = `--${name}=`;
    const arg = process.argv.find((a) => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : undefined;
};

const toFileType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.jpg') return 'jpg';
    if (ext === '.jpeg') return 'jpeg';
    if (ext === '.png') return 'png';
    if (ext === '.pdf') return 'pdf';
    return ext.replace('.', '');
};

const toMimeType = (fileType) => {
    if (fileType === 'jpg' || fileType === 'jpeg') return 'image/jpeg';
    if (fileType === 'png') return 'image/png';
    if (fileType === 'pdf') return 'application/pdf';
    return 'application/octet-stream';
};

const toTitle = (filename) => {
    const base = filename.replace(path.extname(filename), '');
    return base.replace(/[-_]+/g, ' ').trim() || 'Imported Record';
};

const resolveOwner = async () => {
    const userIdArg = getArg('userId');
    const emailArg = getArg('email');

    if (userIdArg) {
        const user = await Patient.findById(userIdArg).select('_id name email role');
        if (!user) throw new Error(`No user found for userId=${userIdArg}`);
        return user;
    }

    if (emailArg) {
        const user = await Patient.findOne({ email: emailArg.toLowerCase().trim() }).select('_id name email role');
        if (!user) throw new Error(`No user found for email=${emailArg}`);
        return user;
    }

    const firstPatient = await Patient.findOne({ role: 'patient' }).sort({ createdAt: 1 }).select('_id name email role');
    if (firstPatient) return firstPatient;

    const fallbackUser = await Patient.findOne({}).sort({ createdAt: 1 }).select('_id name email role');
    if (!fallbackUser) throw new Error('No users found. Create a user first or pass --userId=<id>.');
    return fallbackUser;
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const owner = await resolveOwner();
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);

    if (!files.length) {
        console.log('No files found in uploads directory.');
        await mongoose.disconnect();
        return;
    }

    let imported = 0;
    let skipped = 0;

    for (const filename of files) {
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
            skipped += 1;
            continue;
        }

        const fileUrl = `/uploads/${filename}`;
        const exists = await HealthRecord.exists({ fileUrl });
        if (exists) {
            skipped += 1;
            continue;
        }

        const fileType = toFileType(filename);
        const absolutePath = path.join(UPLOADS_DIR, filename);

        await recordService.createRecord(
            owner._id,
            {
                title: toTitle(filename),
                description: 'Imported from existing uploads folder',
                fileType,
            },
            fileUrl,
            {
                path: absolutePath,
                mimetype: toMimeType(fileType),
                filename,
            }
        );

        imported += 1;
    }

    console.log('Import completed.');
    console.log(`Owner: ${owner.name} <${owner.email}> (${owner._id})`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Import failed:', error.message);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exit(1);
});
