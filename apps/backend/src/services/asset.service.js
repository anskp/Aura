const prisma = require('../config/prisma');

const onboardAsset = async (userId, assetData) => {
    return await prisma.asset.create({
        data: {
            ...assetData,
            ownerId: userId,
            status: 'PENDING'
        }
    });
};

const getUserAssets = async (userId) => {
    return await prisma.asset.findMany({
        where: { ownerId: userId }
    });
};

const getAllAssets = async () => {
    return await prisma.asset.findMany({
        include: { owner: { select: { email: true } } }
    });
};

const updateAssetStatus = async (assetId, status) => {
    return await prisma.asset.update({
        where: { id: assetId },
        data: { status }
    });
};

module.exports = {
    onboardAsset,
    getUserAssets,
    getAllAssets,
    updateAssetStatus
};
