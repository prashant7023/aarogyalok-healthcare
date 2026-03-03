const HealthRecord = require('./record.model');

const createRecord = async (userId, data, fileUrl) =>
    HealthRecord.create({ userId, ...data, fileUrl });

const getRecords = async (userId) => HealthRecord.find({ userId }).sort({ createdAt: -1 });

const getRecordById = async (id, userId) => HealthRecord.findOne({ _id: id, userId });

const deleteRecord = async (id, userId) => HealthRecord.findOneAndDelete({ _id: id, userId });

module.exports = { createRecord, getRecords, getRecordById, deleteRecord };
