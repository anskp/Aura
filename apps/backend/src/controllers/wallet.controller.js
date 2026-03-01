const walletService = require('../services/wallet.service');

const addWallet = async (req, res) => {
    try {
        const { address, chain } = req.body;
        const userId = req.user.id;

        if (!address || !chain) {
            return res.status(400).json({ error: 'Address and chain are required' });
        }

        const wallet = await walletService.addWallet(userId, address, chain);
        res.status(201).json(wallet);
    } catch (error) {
        console.error('Error in addWallet:', error);
        res.status(400).json({ error: error.message });
    }
};

const getWallets = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Fetching wallets for user ${userId}`);
        const wallets = await walletService.getWallets(userId);
        res.status(200).json(wallets);
    } catch (error) {
        console.error('Error in getWallets:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    addWallet,
    getWallets
};
