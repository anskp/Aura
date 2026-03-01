const prisma = require('../config/prisma');
const userService = require('./user.service');

const addWallet = async (userId, address, chain) => {
    // Check if wallet already exists for this user and chain
    const existingWallet = await prisma.wallet.findFirst({
        where: {
            address: address.toLowerCase(),
            chain
        }
    });

    if (existingWallet) {
        if (existingWallet.userId === userId) {
            // Idempotent: User already has this wallet, just sync and return
            await userService.syncUserOnChain(userId);
            return existingWallet;
        }
        throw new Error('Wallet already connected to another account');
    }

    const wallet = await prisma.wallet.create({
        data: {
            userId,
            address: address.toLowerCase(),
            chain
        }
    });

    // Trigger on-chain sync in case the user is already KYC approved
    await userService.syncUserOnChain(userId);

    return wallet;
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
