const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kyc.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/token', protect, kycController.getSDKToken);
router.get('/status', protect, kycController.getKYCStatus);
router.post('/verify-completion', protect, kycController.verifyCompletion);
router.post('/webhook', kycController.handleWebhook);

module.exports = router;
