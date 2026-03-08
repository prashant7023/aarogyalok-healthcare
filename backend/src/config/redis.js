const Redis = require('ioredis');

let client = null;

/**
 * Get or create a singleton Redis client.
 * Gracefully handles connection failures so the rest of the app still runs.
 */
const getRedisClient = () => {
    if (client) return client;

    const url = process.env.REDIS_URL;
    if (!url) {
        console.warn('⚠️  REDIS_URL not set – medication reminders will be disabled.');
        return null;
    }

    client = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 5) return null;          // stop retrying after 5 attempts
            return Math.min(times * 500, 3000);  // back off up to 3 s
        },
        reconnectOnError(err) {
            // reconnect on READONLY errors (failover)
            return err.message.includes('READONLY');
        },
    });

    client.on('connect', () => console.log('🟢 Redis connected'));
    client.on('error', (err) => console.error('🔴 Redis error:', err.message));

    return client;
};

module.exports = { getRedisClient };
