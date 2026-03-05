const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireKycApproval } = require('../middleware/kyc.middleware');

const assetController = require('../controllers/asset.controller');

// Marketplace endpoints
router.get('/pools', assetController.getMarketplacePools);

router.post('/buy', protect, requireKycApproval, (req, res) => {
    res.status(200).json({ message: 'Token purchase successful' });
});

router.post('/invest', protect, requireKycApproval, (req, res) => {
    res.status(200).json({ message: 'Investment successful' });
});

module.exports = router;
