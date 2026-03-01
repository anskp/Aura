const prisma = require('../config/prisma');
const blockchainService = require('./blockchain.service');

const updateKYC = async (userId, status) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: status },
        include: { wallets: true }
    });

    if (status === 'APPROVED') {
        // Register on-chain
        // Assuming we register the first Sepolia/ETH wallet if multiple exist
        const ethWallet = user.wallets.find(w => w.chain === 'ETH_SEP') || user.wallets[0];

        if (ethWallet) {
            try {
                await blockchainService.registerIdentity(ethWallet.address);
                console.log(`Identity registered on-chain for user ${userId}`);
            } catch (err) {
                console.error(`Failed to register identity on-chain for user ${userId}:`, err.message);
                // We might want to handle this error (e.g., mark as partially verified or retry)
                // For now, we'll just log it.
            }
        } else {
            console.warn(`No wallet found for user ${userId} to register on-chain`);
        }
    }

    return user;
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
    getAllUsers
};
