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

    async grantCoordinatorRole(targetAddress) {
        try {
            const abi = [
                "function grantRole(bytes32 role, address account) external",
                "function COORDINATOR_ROLE() view returns (bytes32)"
            ];

            const navOracle = new ethers.Contract(process.env.NAV_ORACLE_ADDRESS, abi, this.wallet);
            const porOracle = new ethers.Contract(process.env.POR_ORACLE_ADDRESS, abi, this.wallet);
            const role = await navOracle.COORDINATOR_ROLE();

            console.log(`Granting COORDINATOR_ROLE to ${targetAddress} on NavOracle...`);
            const tx1 = await navOracle.grantRole(role, targetAddress);
            await tx1.wait();

            console.log(`Granting COORDINATOR_ROLE to ${targetAddress} on PorOracle...`);
            const tx2 = await porOracle.grantRole(role, targetAddress);
            await tx2.wait();

            return { navHash: tx1.hash, porHash: tx2.hash };
        } catch (error) {
            console.error('Error granting role:', error);
            throw error;
        }
    }

    async syncOracleData(poolId, assetIdBytes32, valuation) {
        try {
            const navAbi = ["function setNav(bytes32 poolId, uint256 nav, uint256 timestamp, bytes32 reportId) external"];
            const porAbi = ["function setReserve(bytes32 assetId, uint256 reserve, uint256 timestamp, bytes32 reportId) external"];

            const navOracle = new ethers.Contract(process.env.NAV_ORACLE_ADDRESS, navAbi, this.wallet);
            const porOracle = new ethers.Contract(process.env.POR_ORACLE_ADDRESS, porAbi, this.wallet);

            const valuationWei = ethers.parseEther(valuation.toString());
            const now = Math.floor(Date.now() / 1000);

            console.log(`Syncing NAV for ${poolId}: ${valuation}`);
            const tx1 = await navOracle.setNav(poolId, valuationWei, now, ethers.ZeroHash);
            await tx1.wait();

            console.log(`Syncing Reserve for ${assetIdBytes32}: ${valuation}`);
            const tx2 = await porOracle.setReserve(assetIdBytes32, valuationWei, now, ethers.ZeroHash);
            await tx2.wait();

            return { navHash: tx1.hash, porHash: tx2.hash };
        } catch (error) {
            console.error('Error syncing oracle data:', error);
            throw error;
        }
    }
    async mintMockUSDC(to, amount) {
        try {
            const abi = ["function mint(address to, uint256 amount) external"];
            const usdc = new ethers.Contract(process.env.STABLECOIN_ADDRESS, abi, this.wallet);

            console.log(`Minting ${amount} Mock USDC to ${to}...`);
            const tx = await usdc.mint(to, ethers.parseUnits(amount.toString(), 6));
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Error minting tokens:', error);
            throw error;
        }
    }
}

module.exports = new BlockchainService();
