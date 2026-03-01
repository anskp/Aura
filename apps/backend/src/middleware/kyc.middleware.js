const requireKycApproval = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.kycStatus !== 'APPROVED') {
        return res.status(403).json({ error: 'KYC required' });
    }

    next();
};

module.exports = { requireKycApproval };
