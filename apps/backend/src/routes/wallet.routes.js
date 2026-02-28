const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, walletController.addWallet);
router.get('/', protect, walletController.getWallets);

module.exports = router;
