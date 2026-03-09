const prisma = require('../config/prisma');
const userService = require('./user.service');

const canRelinkWallet = () => {
    // Safe default for local/dev workflows; disable in production unless explicitly enabled.
    if (process.env.ALLOW_WALLET_RELINK === 'true') return true;
    return process.env.NODE_ENV !== 'production';
};

const addWallet = async (userId, address, chain) => {
    const normalizedAddress = address.toLowerCase();

    // Check if wallet already exists for this user and chain
    const existingWallet = await prisma.wallet.findFirst({
        where: {
            address: normalizedAddress,
            chain
        }
    });

    if (existingWallet) {
        if (existingWallet.userId === userId) {
            // Idempotent: User already has this wallet, just sync and return
            await userService.syncUserOnChain(userId);
            return existingWallet;
        }

        if (!canRelinkWallet()) {
            throw new Error('Wallet already connected to another account');
        }

        // Local/dev recovery path: move wallet ownership to current user.
        const relinkedWallet = await prisma.wallet.update({
            where: { id: existingWallet.id },
            data: { userId }
        });

        await userService.syncUserOnChain(userId);
        return relinkedWallet;
    }

    const wallet = await prisma.wallet.create({
        data: {
            userId,
            address: normalizedAddress,
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
