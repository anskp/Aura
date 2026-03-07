const prisma = require('../config/prisma');
const geminiService = require('./gemini.service');

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
            status: 'PENDING'
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
            owner: {
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

const finalizeTokenization = async (assetId, tokenData) => {
    const { address, symbol, name, nav, por, navOracle, porContract } = tokenData;

    console.log(`[Asset Service] Finalizing tokenization for asset ${assetId} at ${address}`);
    // Update asset
    await prisma.asset.update({
        where: { id: assetId },
        data: {
            status: 'TOKENIZED',
            tokenAddress: address,
            nav: nav,
            por: por
        }
    });

    // Upsert token record
    const token = await prisma.token.upsert({
        where: { assetId },
        create: {
            address,
            symbol,
            name,
            assetId,
            navOracle,
            porContract
        },
        update: {
            address,
            navOracle,
            porContract
        }
    });

    return token;
};

const finalizeListing = async (assetId, poolData) => {
    const { address, stablecoinAddress } = poolData;

    console.log(`[Asset Service] Listing asset ${assetId} in pool ${address}`);
    await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'LISTED' }
    });

    // Upsert pool record
    const pool = await prisma.pool.upsert({
        where: { assetId },
        create: {
            address,
            assetId,
            stablecoinAddress,
            status: 'ACTIVE'
        },
        update: {
            address,
            stablecoinAddress,
            status: 'ACTIVE'
        }
    });

    console.log(`[Asset Service] Pool record updated/created for asset ${assetId}`);
    return pool;
};

const getMarketplacePools = async () => {
    const pools = await prisma.pool.findMany({
        where: { status: 'ACTIVE' },
        include: { asset: { include: { token: true } } }
    });
    return pools.map(pool => ({
        ...pool,
        totalLiquidity: Number(pool.totalLiquidity),
        asset: {
            ...pool.asset,
            valuation: Number(pool.asset.valuation),
            aiPricing: Number(pool.asset.aiPricing),
            nav: Number(pool.asset.nav)
        }
    }));
};

const syncAssetOracle = async (assetId) => {
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { token: true }
    });

    if (!asset || !asset.tokenAddress) {
        throw new Error("Asset or token address not found");
    }

    const { ethers } = require('ethers');
    const blockchainService = require('./blockchain.service');

    const poolId = ethers.keccak256(ethers.toUtf8Bytes(asset.name));
    const assetIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(asset.id), 32);

    // Use aiPricing or valuation as the source of truth for sync
    const valuation = asset.aiPricing || asset.valuation;

    console.log(`[Asset Service] Backend syncing oracle for ${asset.name}...`);
    const hashes = await blockchainService.syncOracleData(poolId, assetIdBytes32, valuation);

    // Update DB with the latest synced values
    await prisma.asset.update({
        where: { id: assetId },
        data: {
            nav: valuation,
            por: valuation
        }
    });

    return hashes;
};

const grantGovernanceRole = async (walletAddress) => {
    console.log(`[Asset Service] Backend granting coordinator role to ${walletAddress}...`);
    const blockchainService = require('./blockchain.service');
    return await blockchainService.grantCoordinatorRole(walletAddress);
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets,
    updateAssetStatus,
    finalizeTokenization,
    finalizeListing,
    getMarketplacePools,
    syncAssetOracle,
    grantGovernanceRole
};
