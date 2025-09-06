import jwt from 'jsonwebtoken';

// Middleware for protecting routes
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret';
        const decoded = jwt.verify(token, accessTokenSecret);

        if (decoded.type !== 'access') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        // This catches expired tokens, malformed tokens, etc.
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired access token'
        });
    }
};