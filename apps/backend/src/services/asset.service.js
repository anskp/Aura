const prisma = require('../config/prisma');
const geminiService = require('./gemini.service');
const blockchainService = require('./blockchain.service');
const { ethers } = require('ethers');

const onboardAsset = async (userId, assetData) => {
    console.log(`[Asset Service] Onboarding new asset: ${assetData.name}`);
    // Get AI valuation
    const aiValuation = await geminiService.getAssetValuation(assetData);
    console.log(`[Asset Service] AI Valuation for ${assetData.name}: ${aiValuation.recommendedValuation}`);

    const asset = await prisma.asset.create({
        data: {
            ...assetData,
            valuation: assetData.valuation,
            aiPricing: aiValuation.recommendedValuation,
            aiReasoning: aiValuation.reasoning,
            ownerId: userId,
            status: 'PENDING',
            updatedAt: new Date()
        }
    });

    console.log(`[Asset Service] Asset created in DB with ID: ${asset.id}`);
    return {
        ...asset,
        valuation: Number(asset.valuation),
        aiPricing: Number(asset.aiPricing)
    };
};

const getUserAssets = async (userId) => {
    const assets = await prisma.asset.findMany({
        where: { ownerId: userId },
        include: { token: true, pool: true }
    });
    return assets.map(asset => ({
        ...asset,
        valuation: Number(asset.valuation),
        aiPricing: Number(asset.aiPricing),
        nav: asset.nav ? Number(asset.nav) : null,
        por: asset.por ? Number(asset.por) : null
    }));
};

const getAllAssets = async () => {
    const assets = await prisma.asset.findMany({
        include: {
            user: {
                select: {
                    email: true,
                    wallets: true
                }
            },
            token: true,
            pool: true
        }
    });
    return assets.map(asset => ({
        ...asset,
        owner: asset.user,
        valuation: Number(asset.valuation),
        aiPricing: Number(asset.aiPricing),
        nav: asset.nav ? Number(asset.nav) : null,
        por: asset.por ? Number(asset.por) : null
    }));
};

const updateAssetStatus = async (assetId, status) => {
    // If approving, we also initialize NAV and PoR using AI pricing
    if (status === 'APPROVED') {
        const currentAsset = await prisma.asset.findUnique({ where: { id: assetId } });
        const asset = await prisma.asset.update({
            where: { id: assetId },
            data: {
                status,
                nav: currentAsset.aiPricing || currentAsset.valuation,
                por: currentAsset.aiPricing || currentAsset.valuation
            }
        });

        // Auto-sync on-chain if it's already tokenized or just approved
        if (asset.tokenAddress) {
            console.log(`[Asset Service] Auto-syncing on-chain for approved/updated asset ${assetId}`);
            syncAssetOracle(assetId).catch(err => console.error("Auto-sync failed:", err));
        }

        return {
            ...asset,
            valuation: Number(asset.valuation),
            aiPricing: Number(asset.aiPricing),
            nav: Number(asset.nav),
            por: Number(asset.por)
        };
    }

    const asset = await prisma.asset.update({
        where: { id: assetId },
        data: { status }
    });
    return {
        ...asset,
        valuation: Number(asset.valuation),
        aiPricing: Number(asset.aiPricing)
    };
};

const prepareTokenization = async (assetId, userAddress) => {
    console.log(`[Asset Service] Preparing tokenization data for asset ${assetId}`);
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Asset not found");

    return blockchainService.prepareTokenDeployment(asset.name, asset.symbol, userAddress);
};

const finalizeTokenization = async (assetId, tokenAddress, txHash, userAddress) => {
    console.log(`[Asset Service] Finalizing tokenization for asset ${assetId} at ${tokenAddress}`);

    await prisma.asset.update({
        where: { id: assetId },
        data: {
            status: 'TOKENIZED',
            tokenAddress,
            deploymentTxHash: txHash
        }
    });

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });

    const token = await prisma.token.create({
        data: {
            address: tokenAddress,
            deploymentTxHash: txHash,
            name: asset.name,
            symbol: asset.symbol,
            assetId,
            navOracleAddress: process.env.NAV_ORACLE_ADDRESS,
            porAddress: process.env.POR_ORACLE_ADDRESS
        }
    });

    // Link NavOracle on-chain (Backend can do this since it holds Admin/Coordinator role usually, 
    // OR we provide data for user to do it. Let's let user do it in a multi-step flow if we want pure non-custodial.
    // However, setNavOracle on AuraRwaToken is DEFAULT_ADMIN_ROLE.
    // If user deploys, they are owner/admin. So they must call setNavOracle.

    await blockchainService.recordTransaction(assetId, 'DEPLOY_TOKEN', txHash, userAddress);

    // Prime NAV/PoR as soon as token exists so pools won't start in unhealthy state.
    try {
        await syncAssetOracle(assetId);
    } catch (err) {
        console.error(`[Asset Service] Initial oracle sync after tokenization failed for asset ${assetId}:`, err.message);
    }

    return token;
};

const prepareListing = async (assetId, userAddress) => {
    console.log(`[Asset Service] Preparing listing data for asset ${assetId}`);
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.tokenAddress) throw new Error("Asset must be tokenized first");

    const poolId = ethers.encodeBytes32String(`POOL_${asset.id}`);
    const assetIdBytes32 = ethers.encodeBytes32String(`ASSET_${asset.id}`);
    const shareName = `${asset.symbol || asset.name} Pool Share`;
    const shareSymbol = `PS-${(asset.symbol || 'AURA').slice(0, 8).toUpperCase()}`;

    return blockchainService.preparePoolDeployment(
        userAddress,
        asset.tokenAddress,
        poolId,
        assetIdBytes32,
        shareName,
        shareSymbol
    );
};

const finalizeListing = async (assetId, poolAddress, txHash, userAddress) => {
    console.log(`[Asset Service] Finalizing listing for asset ${assetId} at ${poolAddress}`);

    await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'LISTED' }
    });

    const pool = await prisma.pool.create({
        data: {
            address: poolAddress,
            assetId,
            stablecoinAddress: process.env.STABLECOIN_ADDRESS || "0x0000000000000000000000000000000000000000",
            deploymentTxHash: txHash,
            status: 'ACTIVE'
        }
    });

    await blockchainService.recordTransaction(assetId, 'DEPLOY_POOL', txHash, userAddress);

    // Compliance module checks transfer recipients too; every pool contract must be whitelisted.
    try {
        await blockchainService.registerIdentity(poolAddress);
    } catch (err) {
        console.error(`[Asset Service] Pool identity registration failed for ${poolAddress}:`, err.message);
    }

    // Ensure newly listed pools are investable immediately.
    try {
        await syncAssetOracle(assetId);
    } catch (err) {
        console.error(`[Asset Service] Oracle sync after listing failed for asset ${assetId}:`, err.message);
    }

    return pool;
};

const recordInvestment = async (poolId, investmentData) => {
    console.log(`[Asset Service] Recording investment for pool ${poolId}`);

    const { investorAddress, amountPaid, sharesReceived, txHash } = investmentData;

    // Convert values to search for assetId if needed for transaction log
    const pool = await prisma.pool.findUnique({
        where: { id: parseInt(poolId) },
        select: { assetId: true }
    });

    const investment = await prisma.investment.create({
        data: {
            poolId: parseInt(poolId),
            investorAddress,
            amountPaid,
            sharesReceived,
            txHash
        }
    });

    // Update Pool total shares and liquidity
    await prisma.pool.update({
        where: { id: parseInt(poolId) },
        data: {
            totalLiquidity: { increment: amountPaid },
            totalShares: { increment: sharesReceived }
        }
    });

    // Record it as a transaction as well
    await blockchainService.recordTransaction(pool?.assetId, 'INVEST', txHash, investorAddress);

    return investment;
};

const getMarketplacePools = async () => {
    const pools = await prisma.pool.findMany({
        where: { status: 'ACTIVE' },
        include: { asset: { include: { token: true } } }
    });
    return pools.map(pool => ({
        ...pool,
        totalLiquidity: Number(pool.totalLiquidity),
        totalShares: Number(pool.totalShares),
        asset: {
            ...pool.asset,
            valuation: Number(pool.asset.valuation),
            aiPricing: Number(pool.asset.aiPricing),
            nav: Number(pool.asset.nav)
        }
    }));
};

const recordRedemption = async (poolId, redemptionData) => {
    console.log(`[Asset Service] Recording redemption for pool ${poolId}`);

    const { investorAddress, amountReturned, sharesBurned, txHash } = redemptionData;
    const pool = await prisma.pool.findUnique({
        where: { id: parseInt(poolId) },
        select: { assetId: true }
    });

    await prisma.pool.update({
        where: { id: parseInt(poolId) },
        data: {
            totalLiquidity: { decrement: amountReturned },
            totalShares: { decrement: sharesBurned }
        }
    });

    await blockchainService.recordTransaction(pool?.assetId, 'REDEEM', txHash, investorAddress);

    return {
        poolId: parseInt(poolId),
        investorAddress,
        amountReturned,
        sharesBurned,
        txHash
    };
};

const requestBridge = async ({ receiver, amount, data }) => {
    if (!receiver || !amount) {
        throw new Error("receiver and amount are required");
    }

    const result = await blockchainService.triggerCreCcipTransfer(receiver, amount, data || "0x");
    return {
        status: 'SUBMITTED',
        workflowResult: result
    };
};

const prepareBridgeSender = async ({ tokenAddress, senderAddress }) => {
    return await blockchainService.ensureCcipSenderToken(tokenAddress, senderAddress);
};

const syncAssetOracle = async (assetId) => {
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { token: true }
    });

    if (!asset || !asset.tokenAddress) {
        throw new Error("Asset or token address not found");
    }

    const poolId = ethers.encodeBytes32String(`POOL_${asset.id}`);
    const assetIdBytes32 = ethers.encodeBytes32String(`ASSET_${asset.id}`);
    const valuation = asset.aiPricing || asset.valuation;

    console.log(`[Asset Service] Backend syncing oracle for ${asset.name}...`);
    const hashes = await blockchainService.syncOracleData(poolId, assetIdBytes32, valuation);

    // Also trigger Chainlink CRE for decentralized reporting
    await blockchainService.triggerCreNavPor(assetId, valuation, valuation);

    // Update DB with the latest synced values
    await prisma.asset.update({
        where: { id: assetId },
        data: {
            nav: valuation,
            por: valuation
        }
    });

    await blockchainService.recordTransaction(assetId, 'SYNC_ORACLE', hashes.navHash, 'SYSTEM');

    return hashes;
};

const grantGovernanceRole = async (walletAddress) => {
    console.log(`[Asset Service] Backend granting coordinator role to ${walletAddress}...`);
    return await blockchainService.grantCoordinatorRole(walletAddress);
};

const getAssetTransactions = async (assetId) => {
    return await prisma.transaction.findMany({
        where: { assetId: parseInt(assetId) },
        orderBy: { createdAt: 'desc' }
    });
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets,
    updateAssetStatus,
    prepareTokenization,
    finalizeTokenization,
    prepareListing,
    finalizeListing,
    recordInvestment,
    recordRedemption,
    requestBridge,
    prepareBridgeSender,
    getMarketplacePools,
    syncAssetOracle,
    grantGovernanceRole,
    getAssetTransactions
};
