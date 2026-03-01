const assetService = require('../services/asset.service');

const onboardAsset = async (req, res) => {
    try {
        const userId = req.user.id;
        const asset = await assetService.onboardAsset(userId, req.body);
        res.status(201).json(asset);
    } catch (error) {
        console.error('Error in onboardAsset:', error);
        res.status(400).json({ error: error.message });
    }
};

const getUserAssets = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Fetching assets for user ${userId}`);
        const assets = await assetService.getUserAssets(userId);
        res.status(200).json(assets);
    } catch (error) {
        console.error('Error in getUserAssets:', error);
        res.status(400).json({ error: error.message });
    }
};

const getAllAssets = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const assets = await assetService.getAllAssets();
        res.status(200).json(assets);
    } catch (error) {
        console.error('Error in getAllAssets:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets
};
