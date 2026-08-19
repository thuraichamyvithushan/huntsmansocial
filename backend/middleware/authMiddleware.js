const jwt = require('jsonwebtoken');
const User = require('../models/User');
const firebaseAdmin = require('../config/firebase');

const findFirebaseUser = async (decodedToken) => {
    const selectors = [];

    if (decodedToken.uid) {
        selectors.push({ firebaseUid: decodedToken.uid });
    }

    if (decodedToken.email) {
        selectors.push({ email: decodedToken.email });
    }

    if (!selectors.length) {
        return null;
    }

    return User.findOne({ $or: selectors }).select('-password');
};

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];

        if (process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = await User.findById(decoded.id).select('-password');

                if (!req.user) {
                    console.error('AUTH ERROR: User in token not found in database.');
                    return res.status(401).json({ message: 'User no longer exists' });
                }

                return next();
            } catch (error) {
                console.warn('App JWT verification failed, trying Firebase token:', error.message);
            }
        }

        try {
            const decodedFirebaseToken = await firebaseAdmin.auth().verifyIdToken(token);
            req.user = await findFirebaseUser(decodedFirebaseToken);

            if (!req.user) {
                console.error('AUTH ERROR: Firebase user not found in database.');
                return res.status(401).json({ message: 'User no longer exists' });
            }

            return next();
        } catch (error) {
            console.error('AUTH TOKEN FAILED:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
