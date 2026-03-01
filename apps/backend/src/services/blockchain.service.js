const { ethers } = require('ethers');
const { IDENTITY_REGISTRY_ABI } = require('../config/abi');

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
    }

    async registerIdentity(userWalletAddress) {
        try {
            if (!userWalletAddress) {
                throw new Error('User wallet address is required');
            }

            console.log(`Registering identity for ${userWalletAddress} on-chain...`);

            const identityRegistry = new ethers.Contract(
                this.identityRegistryAddress,
                IDENTITY_REGISTRY_ABI,
                this.wallet
            );

            // Call setVerified(address, true)
            const tx = await identityRegistry.setVerified(userWalletAddress, true);
            console.log(`Transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

            return tx.hash;
        } catch (error) {
            console.error('Error registering identity on-chain:', error);
            throw error;
        }
    }

    async isVerified(userWalletAddress) {
        try {
            const identityRegistry = new ethers.Contract(
                this.identityRegistryAddress,
                IDENTITY_REGISTRY_ABI,
                this.provider
            );
            return await identityRegistry.isVerified(userWalletAddress);
        } catch (error) {
            console.error('Error checking verification status:', error);
            return false;
        }
    }
}

module.exports = new BlockchainService();
