const assetService = require('../services/asset.service');

const onboardAsset = async (req, res) => {
    try {
        const userId = req.user.id;
        const asset = await assetService.onboardAsset(userId, req.body);
        res.status(201).json(asset);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getUserAssets = async (req, res) => {
    try {
        const userId = req.user.id;
        const assets = await assetService.getUserAssets(userId);
        res.status(200).json(assets);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllAssets = async (req, res) => {
    try {
        // Admin only check maybe?
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const assets = await assetService.getAllAssets();
        res.status(200).json(assets);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets
};
