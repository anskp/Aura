const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/onboard', protect, assetController.onboardAsset);
router.get('/my-assets', protect, assetController.getUserAssets);
router.get('/admin/all', protect, assetController.getAllAssets);
router.post('/admin/approve/:id', protect, assetController.approveAsset);
router.post('/finalize-tokenization/:id', protect, assetController.finalizeTokenization);
router.post('/finalize-listing/:id', protect, assetController.finalizeListing);
router.post('/sync-oracle/:id', protect, assetController.syncOracle);
router.post('/admin/grant-role', protect, assetController.grantRole);
router.post('/faucet', protect, assetController.requestFaucet);

module.exports = router;
