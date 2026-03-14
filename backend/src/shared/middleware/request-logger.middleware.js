const shouldSkipLog = (req) => {
    // Skip noisy health checks unless explicit debugging is needed.
    return req.path === '/health';
};

const formatUserContext = (req) => {
    if (!req.user?._id) return 'anon';
    return `${req.user.role || 'user'}:${req.user._id}`;
};

const requestLogger = (req, res, next) => {
    if (shouldSkipLog(req)) return next();

    const startedAt = process.hrtime.bigint();
    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];

    res.on('finish', () => {
        const elapsedNs = process.hrtime.bigint() - startedAt;
        const elapsedMs = Number(elapsedNs) / 1e6;
        const status = res.statusCode;
        const user = formatUserContext(req);

        console.log(
            `[API] ${method} ${path} ${status} ${elapsedMs.toFixed(1)}ms ip=${ip} user=${user} bodyKeys=${bodyKeys.join(',') || '-'}`
        );
    });

    next();
};

module.exports = { requestLogger };