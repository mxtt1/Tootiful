export const AgencyRole = {
    requireSuperAgencyAdmin: (req, res, next) => {
        if (!req.user || req.user.role !== 'superAgencyAdmin') {
            return res.status(403).json({ message: 'Forbidden: Requires superAgencyAdmin role' });
        }
        next();
    }
};