const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/onboard', protect, assetController.onboardAsset);
router.get('/my-assets', protect, assetController.getUserAssets);
router.get('/admin/all', protect, assetController.getAllAssets);
router.post('/admin/approve/:id', protect, assetController.approveAsset);

module.exports = router;
