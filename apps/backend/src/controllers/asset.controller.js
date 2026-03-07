const assetService = require('../services/asset.service');

const onboardAsset = async (req, res) => {
    try {
        console.log(`[API] Received onboard request for ${req.body.name}`);
        const userId = req.user.id;
        const asset = await assetService.onboardAsset(userId, req.body);
        res.status(201).json(asset);
    } catch (error) {
        console.error(`[API Error] onboardAsset: ${error.message}`);
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

const approveAsset = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { id } = req.params;
        console.log(`[API] Admin approving asset ID: ${id}`);
        const asset = await assetService.updateAssetStatus(parseInt(id), 'APPROVED');
        res.status(200).json(asset);
    } catch (error) {
        console.error(`[API Error] approveAsset: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const finalizeTokenization = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[API] Finalizing tokenization for asset ID: ${id}`);
        const token = await assetService.finalizeTokenization(parseInt(id), req.body);
        res.status(200).json(token);
    } catch (error) {
        console.error(`[API Error] finalizeTokenization: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const finalizeListing = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[API] Finalizing listing for asset ID: ${id}`);
        const pool = await assetService.finalizeListing(parseInt(id), req.body);
        res.status(200).json(pool);
    } catch (error) {
        console.error(`[API Error] finalizeListing: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const getMarketplacePools = async (req, res) => {
    try {
        const pools = await assetService.getMarketplacePools();
        res.status(200).json(pools);
    } catch (error) {
        console.error('Error in getMarketplacePools:', error);
        res.status(400).json({ error: error.message });
    }
};

const syncOracle = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[API] Syncing oracle for asset ID: ${id}`);
        const result = await assetService.syncAssetOracle(parseInt(id));
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] syncOracle: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const grantRole = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { address } = req.body;
        console.log(`[API] Granting coordinator role to: ${address}`);
        const result = await assetService.grantGovernanceRole(address);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] grantRole: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const requestFaucet = async (req, res) => {
    try {
        const { address } = req.body;
        console.log(`[API] Faucet request for: ${address}`);
        const blockchainService = require('../services/blockchain.service');
        const hash = await blockchainService.mintMockUSDC(address, 1000);
        res.status(200).json({ hash });
    } catch (error) {
        console.error(`[API Error] requestFaucet: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets,
    approveAsset,
    finalizeTokenization,
    finalizeListing,
    getMarketplacePools,
    syncOracle,
    grantRole,
    requestFaucet
};
