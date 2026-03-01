const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireKycApproval } = require('../middleware/kyc.middleware');

router.post('/', protect, requireKycApproval, walletController.addWallet);
router.get('/', protect, walletController.getWallets);

module.exports = router;
