require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const result = await mongoose.connection.collection('users').updateMany(
        {},
        [{ $set: { fcmTokens: { $reduce: { input: '$fcmTokens', initialValue: [], in: { $cond: [{ $in: ['$$this', '$$value'] }, '$$value', { $concatArrays: ['$$value', ['$$this']] }] } } } } }]
    );
    console.log('Deduplicated:', result.modifiedCount, 'user doc(s)');
    await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
