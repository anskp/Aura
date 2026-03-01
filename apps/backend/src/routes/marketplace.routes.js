const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireKycApproval } = require('../middleware/kyc.middleware');

// Mock marketplace endpoints to demonstrate KYC guarding
router.post('/buy', protect, requireKycApproval, (req, res) => {
    res.status(200).json({ message: 'Token purchase successful' });
});

router.post('/invest', protect, requireKycApproval, (req, res) => {
    res.status(200).json({ message: 'Investment successful' });
});

module.exports = router;
