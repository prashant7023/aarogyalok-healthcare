const QueueToken = require('./queue.model');

const getNextToken = async (hospitalId) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const count = await QueueToken.countDocuments({ hospitalId, createdAt: { $gte: today } });
    return count + 1;
};

const issueToken = async (userId, hospitalId, io) => {
    const tokenNumber = await getNextToken(hospitalId);
    const token = await QueueToken.create({ hospitalId, userId, tokenNumber });
    const waiting = await QueueToken.countDocuments({ hospitalId, status: 'waiting' });
    io.to(`hospital-${hospitalId}`).emit('queue-update', { hospitalId, waiting });
    return token;
};

const getQueueStatus = async (hospitalId) =>
    QueueToken.find({ hospitalId, status: 'waiting' }).populate('userId', 'name').sort({ tokenNumber: 1 });

const callNextToken = async (hospitalId, io) => {
    await QueueToken.findOneAndUpdate({ hospitalId, status: 'serving' }, { status: 'done' });
    const next = await QueueToken.findOneAndUpdate(
        { hospitalId, status: 'waiting' }, { status: 'serving' }, { new: true, sort: { tokenNumber: 1 } }
    );
    if (next) io.to(`hospital-${hospitalId}`).emit('next-token', { tokenNumber: next.tokenNumber });
    return next;
};

const getMyToken = async (userId) =>
    QueueToken.findOne({ userId, status: { $in: ['waiting', 'serving'] } }).sort({ createdAt: -1 });

module.exports = { issueToken, getQueueStatus, callNextToken, getMyToken };
