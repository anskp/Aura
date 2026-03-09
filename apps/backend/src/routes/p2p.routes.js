const express = require('express');
const router = express.Router();
const p2pController = require('../controllers/p2p.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireKycApproval } = require('../middleware/kyc.middleware');

router.get('/orders', protect, p2pController.getOrderBook);
router.get('/my', protect, p2pController.getMyOrders);
router.get('/config', protect, p2pController.getConfig);
router.post('/orders', protect, requireKycApproval, p2pController.createSellOrder);
router.post('/orders/fill', protect, requireKycApproval, p2pController.fillOrder);
router.post('/orders/:orderId/cancel', protect, requireKycApproval, p2pController.cancelOrder);

module.exports = router;
