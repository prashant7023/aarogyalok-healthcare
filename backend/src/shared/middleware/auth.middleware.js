const jwt = require('jsonwebtoken');
const Patient = require('../../modules/auth/patient.model');
const Doctor = require('../../modules/auth/doctor.model');

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized, no token' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

        let user;
        if (decoded.role === 'doctor') {
            user = await Doctor.findById(decoded.id).select('-password');
        } else {
            user = await Patient.findById(decoded.id).select('-password');
            // Fallback: old JWTs without role — also check Doctor collection
            if (!user) {
                user = await Doctor.findById(decoded.id).select('-password');
            }
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

const restrict = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: `Role '${req.user?.role}' is not authorized` });
        }
        next();
    };
};

module.exports = { protect, restrict };
