const prisma = require('../config/prisma');

const onboardAsset = async (userId, assetData) => {
    const asset = await prisma.asset.create({
        data: {
            ...assetData,
            ownerId: userId,
            status: 'PENDING'
        }
    });
    return { ...asset, valuation: Number(asset.valuation) };
};

const getUserAssets = async (userId) => {
    const assets = await prisma.asset.findMany({
        where: { ownerId: userId }
    });
    return assets.map(asset => ({
        ...asset,
        valuation: Number(asset.valuation)
    }));
};

const getAllAssets = async () => {
    const assets = await prisma.asset.findMany({
        include: { owner: { select: { email: true } } }
    });
    return assets.map(asset => ({
        ...asset,
        valuation: Number(asset.valuation)
    }));
};

const updateAssetStatus = async (assetId, status) => {
    const asset = await prisma.asset.update({
        where: { id: assetId },
        data: { status }
    });
    return { ...asset, valuation: Number(asset.valuation) };
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets,
    updateAssetStatus
};
