const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/onboard', protect, upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'ownershipProof', maxCount: 1 },
    { name: 'valuationProof', maxCount: 1 },
    { name: 'legalCompliance', maxCount: 1 },
    { name: 'logistics', maxCount: 1 }
]), assetController.onboardAsset);
router.get('/my-assets', protect, assetController.getUserAssets);
router.get('/admin/all', protect, assetController.getAllAssets);
router.post('/admin/approve/:id', protect, assetController.approveAsset);

// Non-Custodial Orchestration
router.post('/prepare-tokenize/:id', protect, assetController.prepareTokenize);
router.post('/finalize-tokenize/:id', protect, assetController.finalizeTokenize);
router.post('/prepare-list/:id', protect, assetController.prepareList);
router.post('/finalize-list/:id', protect, assetController.finalizeList);

router.post('/invest/:poolId', protect, assetController.recordInvestment);
router.post('/redeem/:poolId', protect, assetController.recordRedemption);
router.post('/bridge/prepare', protect, assetController.prepareBridge);
router.post('/bridge', protect, assetController.requestBridge);
router.get('/marketplace', assetController.getMarketplacePools);
router.post('/sync-oracle/:id', protect, assetController.syncOracle);
router.post('/grant-role', protect, assetController.grantRole);
router.get('/transactions/:id', protect, assetController.getAssetTransactions);
router.post('/faucet', protect, assetController.requestFaucet);

module.exports = router;
