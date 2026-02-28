const prisma = require('../config/prisma');

const addWallet = async (userId, address, chain) => {
    // Check if wallet already exists for this user and chain
    const existingWallet = await prisma.wallet.findFirst({
        where: {
            userId,
            address,
            chain
        }
    });

    if (existingWallet) {
        throw new Error('Wallet already connected for this chain');
    }

    return await prisma.wallet.create({
        data: {
            userId,
            address,
            chain
        }
    });
};

const getWallets = async (userId) => {
    return await prisma.wallet.findMany({
        where: { userId }
    });
};

module.exports = {
    addWallet,
    getWallets
};
