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

const prepareTokenize = async (req, res) => {
    try {
        const { id } = req.params;
        const { userAddress } = req.body;
        console.log(`[API] Preparing tokenization for asset ID: ${id}`);
        const data = await assetService.prepareTokenization(parseInt(id), userAddress);
        res.status(200).json(data);
    } catch (error) {
        console.error(`[API Error] prepareTokenize: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const finalizeTokenize = async (req, res) => {
    try {
        const { id } = req.params;
        const { tokenAddress, txHash, userAddress } = req.body;
        console.log(`[API] Finalizing tokenization for asset ID: ${id}`);
        const result = await assetService.finalizeTokenization(parseInt(id), tokenAddress, txHash, userAddress);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] finalizeTokenize: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const prepareList = async (req, res) => {
    try {
        const { id } = req.params;
        const { userAddress } = req.body;
        console.log(`[API] Preparing listing for asset ID: ${id}`);
        const data = await assetService.prepareListing(parseInt(id), userAddress);
        res.status(200).json(data);
    } catch (error) {
        console.error(`[API Error] prepareList: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const finalizeList = async (req, res) => {
    try {
        const { id } = req.params;
        const { poolAddress, txHash, userAddress } = req.body;
        console.log(`[API] Finalizing listing for asset ID: ${id}`);
        const result = await assetService.finalizeListing(parseInt(id), poolAddress, txHash, userAddress);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] finalizeList: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const recordInvestment = async (req, res) => {
    try {
        const { poolId } = req.params;
        console.log(`[API] Recording investment for pool: ${poolId}`);
        const investment = await assetService.recordInvestment(parseInt(poolId), req.body, req.user.id);
        res.status(200).json(investment);
    } catch (error) {
        console.error(`[API Error] recordInvestment: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const recordRedemption = async (req, res) => {
    try {
        const { poolId } = req.params;
        console.log(`[API] Recording redemption for pool: ${poolId}`);
        const redemption = await assetService.recordRedemption(parseInt(poolId), req.body);
        res.status(200).json(redemption);
    } catch (error) {
        console.error(`[API Error] recordRedemption: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const requestBridge = async (req, res) => {
    try {
        const { receiver, amount, data } = req.body;
        const result = await assetService.requestBridge({ receiver, amount, data });
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] requestBridge: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const prepareBridge = async (req, res) => {
    try {
        const { tokenAddress, senderAddress } = req.body;
        const result = await assetService.prepareBridgeSender({ tokenAddress, senderAddress });
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] prepareBridge: ${error.message}`);
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

const getAssetTransactions = async (req, res) => {
    try {
        const { id } = req.params;
        const transactions = await assetService.getAssetTransactions(id);
        res.status(200).json(transactions);
    } catch (error) {
        console.error(`[API Error] getAssetTransactions: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets,
    approveAsset,
    prepareTokenize,
    finalizeTokenize,
    prepareList,
    finalizeList,
    recordInvestment,
    recordRedemption,
    prepareBridge,
    requestBridge,
    getMarketplacePools,
    syncOracle,
    grantRole,
    requestFaucet,
    getAssetTransactions
};
