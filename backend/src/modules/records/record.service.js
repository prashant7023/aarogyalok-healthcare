const HealthRecord = require('./record.model');

const createRecord = async (userId, data, fileUrl) =>
    HealthRecord.create({ userId, ...data, fileUrl });

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

module.exports = { createRecord, getAllRecords, getRecords, getRecordById, deleteRecord };
