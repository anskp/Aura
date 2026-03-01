const prisma = require('../config/prisma');
const blockchainService = require('./blockchain.service');

const updateKYC = async (userId, status) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: status }
    });

    if (status === 'APPROVED') {
        await syncUserOnChain(userId);
    }

    return user;
};

const syncUserOnChain = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallets: true }
    });

    if (!user || user.kycStatus !== 'APPROVED') {
        return;
    }

    // Register on-chain
    // Assuming we register the first Sepolia/ETH wallet if multiple exist
    const ethWallet = user.wallets.find(w => w.chain === 'ETH_SEP') || user.wallets[0];

    if (ethWallet) {
        try {
            // Check if already verified to avoid redundant TXs
            const isAlreadyVerified = await blockchainService.isVerified(ethWallet.address);
            if (isAlreadyVerified) {
                console.log(`User ${user.email} already verified on-chain at ${ethWallet.address}`);
                return;
            }

            await blockchainService.registerIdentity(ethWallet.address);
            console.log(`Identity registered on-chain for user ${user.email} at ${ethWallet.address}`);
        } catch (err) {
            console.error(`Failed to register identity on-chain for user ${user.email}:`, err.message);
        }
    } else {
        console.warn(`No wallet found for user ${userId} to register on-chain`);
    }
};

const getAllUsers = async () => {
    return await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            kycStatus: true,
            wallets: true,
            assets: true
        }
    });
};

module.exports = {
    updateKYC,
    syncUserOnChain,
    getAllUsers
};
