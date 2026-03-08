const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const path = require('path');
const prisma = new PrismaClient();
const { IDENTITY_REGISTRY_ABI } = require('../config/abi');

// Load contract artifacts
// Path is relative to this file: apps/backend/src/services/blockchain.service.js
const tokenArtifact = require('../../../../packages/contracts/artifacts/contracts/AuraRwaToken.sol/AuraRwaToken.json');
const poolArtifact = require('../../../../packages/contracts/artifacts/contracts/LiquidityPool.sol/LiquidityPool.json');

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
        this.navOracleAddress = process.env.NAV_ORACLE_ADDRESS;
        this.porOracleAddress = process.env.POR_ORACLE_ADDRESS;
        this.stablecoinAddress = process.env.STABLECOIN_ADDRESS;
    }

    async recordTransaction(assetId, actionType, txHash, userAddress, status = 'SUCCESS') {
        try {
            await prisma.transaction.create({
                data: {
                    assetId,
                    actionType,
                    txHash,
                    userAddress,
                    status
                }
            });
        } catch (error) {
            console.error('Error recording transaction:', error);
        }
    }

    /**
     * Prepares data for AuraRwaToken deployment
     */
    prepareTokenDeployment(name, symbol, admin) {
        const factory = new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode);
        // constructor(string name_, string symbol_, address admin, address module)
        // We use ZeroAddress for module (compliance) because IdentityRegistry is NOT a compatible module
        const deployData = factory.getDeployTransaction(name, symbol, admin, ethers.ZeroAddress).data;
        return {
            abi: tokenArtifact.abi,
            bytecode: tokenArtifact.bytecode,
            deployData,
            args: [name, symbol, admin, ethers.ZeroAddress]
        };
    }

    /**
     * Prepares data for LiquidityPool deployment
     */
    preparePoolDeployment(admin, rwaToken, poolId, assetId) {
        const factory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode);
        // constructor(address admin, IERC20 stablecoin_, address rwaToken_, INavOracle navOracle_, IProofOfReserve proofOfReserve_, bytes32 poolId_, bytes32 assetId_)
        const deployData = factory.getDeployTransaction(
            admin,
            this.stablecoinAddress,
            rwaToken,
            this.navOracleAddress,
            this.porOracleAddress,
            poolId,
            assetId
        ).data;
        return {
            abi: poolArtifact.abi,
            bytecode: poolArtifact.bytecode,
            deployData,
            args: [admin, this.stablecoinAddress, rwaToken, this.navOracleAddress, this.porOracleAddress, poolId, assetId]
        };
    }

    async registerIdentity(userWalletAddress) {
        try {
            const identityRegistry = new ethers.Contract(
                this.identityRegistryAddress,
                IDENTITY_REGISTRY_ABI,
                this.wallet
            );
            const tx = await identityRegistry.setVerified(userWalletAddress, true);
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Error registering identity:', error);
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

            const navOracle = new ethers.Contract(this.navOracleAddress, abi, this.wallet);
            const porOracle = new ethers.Contract(this.porOracleAddress, abi, this.wallet);
            const role = await navOracle.COORDINATOR_ROLE();

            const tx1 = await navOracle.grantRole(role, targetAddress);
            await tx1.wait();

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

            const navOracle = new ethers.Contract(this.navOracleAddress, navAbi, this.wallet);
            const porOracle = new ethers.Contract(this.porOracleAddress, porAbi, this.wallet);

            const valuationWei = ethers.parseEther(valuation.toString());
            const now = Math.floor(Date.now() / 1000);

            const tx1 = await navOracle.setNav(poolId, valuationWei, now, ethers.ZeroHash);
            await tx1.wait();

            const tx2 = await porOracle.setReserve(assetIdBytes32, valuationWei, now, ethers.ZeroHash);
            await tx2.wait();

            return { navHash: tx1.hash, porHash: tx2.hash };
        } catch (error) {
            console.error('Error syncing oracle data:', error);
            throw error;
        }
    }

    async triggerCreNavPor(assetId, nav, reserve) {
        try {
            const creUrl = process.env.CHAINLINK_CRE_URL;
            if (!creUrl) {
                console.warn("[Blockchain Service] CHAINLINK_CRE_URL not set. Skipping CRE trigger.");
                return null;
            }

            console.log(`[Blockchain Service] Triggering Chainlink CRE for Asset ${assetId}...`);
            const payload = {
                nav: nav.toString(),
                reserve: reserve.toString(),
                poolId: ethers.encodeBytes32String(`POOL_${assetId}`),
                assetId: ethers.encodeBytes32String(`ASSET_${assetId}`),
                timestamp: Math.floor(Date.now() / 1000)
            };

            const response = await axios.post(creUrl, { input: JSON.stringify(payload) });
            console.log(`[Blockchain Service] CRE triggered successfully:`, response.data);
            return response.data;
        } catch (error) {
            console.error('[Blockchain Service] CRE trigger failed:', error.message);
            return null;
        }
    }

    async mintMockUSDC(to, amount) {
        try {
            const abi = ["function mint(address to, uint256 amount) external"];
            const contract = new ethers.Contract(this.stablecoinAddress, abi, this.wallet);
            const amountWei = ethers.parseUnits(amount.toString(), 6); // Mock USDC is usually 6 decimals
            const tx = await contract.mint(to, amountWei);
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Error minting mock USDC:', error);
            throw error;
        }
    }
}

module.exports = new BlockchainService();
