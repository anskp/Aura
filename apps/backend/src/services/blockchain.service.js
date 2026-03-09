const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const prisma = new PrismaClient();
const { IDENTITY_REGISTRY_ABI } = require('../config/abi');

const repoRoot = path.resolve(__dirname, '../../../../');
const tokenArtifactPath = path.join(
    repoRoot,
    'packages/contracts/artifacts/contracts/AuraRwaToken.sol/AuraRwaToken.json'
);
const poolArtifactPath = path.join(
    repoRoot,
    'packages/contracts/artifacts/contracts/LiquidityPool.sol/LiquidityPool.json'
);

function loadArtifact(artifactPath) {
    const content = fs.readFileSync(artifactPath, 'utf-8');
    return JSON.parse(content);
}

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
        this.navOracleAddress = process.env.NAV_ORACLE_ADDRESS;
        this.porOracleAddress = process.env.POR_ORACLE_ADDRESS;
        this.stablecoinAddress = process.env.STABLECOIN_ADDRESS;
        this.ccipConsumerAddress = process.env.CCIP_CONSUMER_ADDRESS || process.env.CCIP_CONSUMER || this.getContractsEnvValue('CCIP_CONSUMER');
        this.ccipSenderAddress = process.env.CCIP_SENDER_ADDRESS || process.env.CCIP_SENDER || this.getContractsEnvValue('CCIP_SENDER');
        this.ccipReceiverAddress = process.env.CCIP_RECEIVER_ADDRESS || process.env.CCIP_RECEIVER || this.getContractsEnvValue('CCIP_RECEIVER');
    }

    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    getContractsEnvValue(key) {
        try {
            const repoRoot = path.resolve(__dirname, '../../../../');
            const contractsEnvFile = path.join(repoRoot, 'packages/contracts/.env');
            if (!fs.existsSync(contractsEnvFile)) return undefined;
            const content = fs.readFileSync(contractsEnvFile, 'utf-8');
            const line = content
                .split(/\r?\n/)
                .find((l) => l.trim().startsWith(`${key}=`));
            if (!line) return undefined;
            const raw = line.split('=').slice(1).join('=').trim();
            return raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        } catch {
            return undefined;
        }
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
        const tokenArtifact = loadArtifact(tokenArtifactPath);
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
    preparePoolDeployment(admin, rwaToken, poolId, assetId, shareName, shareSymbol) {
        const poolArtifact = loadArtifact(poolArtifactPath);
        const abiNames = new Set(poolArtifact.abi.filter((x) => x.type === 'function').map((x) => x.name));
        const hasBridgeFns = abiNames.has('BRIDGE_ROLE') && abiNames.has('bridgeMint') && abiNames.has('bridgeBurn');
        if (!hasBridgeFns) {
            throw new Error(
                'LiquidityPool artifact is not bridge-enabled. Recompile contracts (`pnpm --filter aura-hardhat exec hardhat compile`) and restart backend.'
            );
        }
        const factory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode);
        // constructor(address admin, IERC20 stablecoin_, address rwaToken_, INavOracle navOracle_, IProofOfReserve proofOfReserve_, bytes32 poolId_, bytes32 assetId_, string shareName_, string shareSymbol_)
        const deployData = factory.getDeployTransaction(
            admin,
            this.stablecoinAddress,
            rwaToken,
            this.navOracleAddress,
            this.porOracleAddress,
            poolId,
            assetId,
            shareName,
            shareSymbol
        ).data;
        return {
            abi: poolArtifact.abi,
            bytecode: poolArtifact.bytecode,
            deployData,
            args: [admin, this.stablecoinAddress, rwaToken, this.navOracleAddress, this.porOracleAddress, poolId, assetId, shareName, shareSymbol]
        };
    }

    async registerIdentity(userWalletAddress) {
        const normalized = (userWalletAddress || '').toLowerCase();
        try {
            // Avoid duplicate submission if already verified.
            const already = await this.isVerified(normalized);
            if (already) return null;

            const identityRegistry = new ethers.Contract(
                this.identityRegistryAddress,
                IDENTITY_REGISTRY_ABI,
                this.wallet
            );
            const tx = await identityRegistry.setVerified(normalized, true);
            await tx.wait();
            return tx.hash;
        } catch (error) {
            const msg = (error?.message || '').toLowerCase();
            if (msg.includes('already known') || msg.includes('nonce too low') || msg.includes('replacement transaction underpriced')) {
                // Transaction is already in mempool or mined; treat as non-fatal and let caller re-check verification.
                return null;
            }
            console.error('Error registering identity:', error);
            throw error;
        }
    }

    async isVerified(userWalletAddress) {
        const identityRegistry = new ethers.Contract(
            this.identityRegistryAddress,
            IDENTITY_REGISTRY_ABI,
            this.provider
        );
        const address = (userWalletAddress || '').toLowerCase();

        for (let i = 0; i < 3; i += 1) {
            try {
                return await identityRegistry.isVerified(address);
            } catch (error) {
                const msg = (error?.message || '').toLowerCase();
                const isTimeout = msg.includes('timeout');
                if (i < 2 && isTimeout) {
                    await this.sleep(500 * (i + 1));
                    continue;
                }
                console.error('Error checking verification status:', error);
                return false;
            }
        }
        return false;
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
            const porAbi = [
                "function setReserve(bytes32 assetId, uint256 reserve, uint256 timestamp, bytes32 reportId) external",
                "function rwaToken() view returns (address)"
            ];
            const erc20Abi = ["function totalSupply() view returns (uint256)"];

            const navOracle = new ethers.Contract(this.navOracleAddress, navAbi, this.wallet);
            const porOracle = new ethers.Contract(this.porOracleAddress, porAbi, this.wallet);

            const valuationWei = ethers.parseEther(valuation.toString());
            let reserveWei = valuationWei;

            // PoR health compares reserve against rwaToken.totalSupply().
            // To avoid false "paused/unhealthy" for per-asset flows, ensure reserve is at least supply.
            try {
                const porTokenAddress = await porOracle.rwaToken();
                const porToken = new ethers.Contract(porTokenAddress, erc20Abi, this.provider);
                const supply = await porToken.totalSupply();
                if (supply > reserveWei) {
                    reserveWei = supply;
                }
            } catch (supplyErr) {
                console.warn(`[Blockchain Service] Could not read PoR token supply, falling back to valuation reserve: ${supplyErr.message}`);
            }

            const now = Math.floor(Date.now() / 1000);

            const tx1 = await navOracle.setNav(poolId, valuationWei, now, ethers.ZeroHash);
            await tx1.wait();

            const tx2 = await porOracle.setReserve(assetIdBytes32, reserveWei, now, ethers.ZeroHash);
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
            const payload = {
                nav: nav.toString(),
                reserve: reserve.toString(),
                poolId: ethers.encodeBytes32String(`POOL_${assetId}`),
                assetId: ethers.encodeBytes32String(`ASSET_${assetId}`),
                timestamp: Math.floor(Date.now() / 1000)
            };

            if (!creUrl) {
                console.warn("[Blockchain Service] CHAINLINK_CRE_URL not set. Using local CRE simulation fallback.");
                return this.runCreLocalSimulation('nav-por-workflow', payload);
            }

            console.log(`[Blockchain Service] Triggering Chainlink CRE for Asset ${assetId}...`);
            const response = await axios.post(creUrl, { input: JSON.stringify(payload) });
            console.log(`[Blockchain Service] CRE triggered successfully:`, response.data);
            return response.data;
        } catch (error) {
            console.error('[Blockchain Service] CRE trigger failed:', error.message);
            return null;
        }
    }

    async triggerCreCcipTransfer(receiver, amount, data = "0x") {
        try {
            // Prefer real on-chain CCIP path when consumer is configured.
            if (this.ccipConsumerAddress) {
                return await this.triggerOnchainCcipTransfer(receiver, amount, data);
            }

            const creUrl = process.env.CHAINLINK_CRE_CCIP_URL || process.env.CHAINLINK_CRE_URL;

            const payload = {
                receiver,
                amount: amount.toString(),
                data
            };

            if (!creUrl) {
                console.warn("[Blockchain Service] CRE CCIP URL not set. Using local CRE simulation fallback.");
                return this.runCreLocalSimulation('ccip-transfer-workflow', payload);
            }

            console.log(`[Blockchain Service] Triggering CRE CCIP workflow for receiver=${receiver}, amount=${amount}`);
            const response = await axios.post(creUrl, { input: JSON.stringify(payload) });
            return response.data;
        } catch (error) {
            console.error('[Blockchain Service] CRE CCIP trigger failed:', error.message);
            throw error;
        }
    }

    async ensureIdentityVerified(account) {
        if (!account || !ethers.isAddress(account)) return false;

        const normalized = account.toLowerCase();
        try {
            const already = await this.isVerified(normalized);
            if (already) return false;

            const identityRegistry = new ethers.Contract(
                this.identityRegistryAddress,
                IDENTITY_REGISTRY_ABI,
                this.wallet
            );
            const tx = await identityRegistry.setVerified(normalized, true);
            await tx.wait();
            return true;
        } catch (error) {
            console.error(`[Blockchain Service] Failed to set identity verified for ${normalized}:`, error.message);
            return false;
        }
    }

    async ensureCcipInfraIdentity() {
        const addresses = [
            this.ccipSenderAddress,
            this.ccipReceiverAddress,
            this.ccipConsumerAddress
        ].filter(Boolean);

        for (const addr of addresses) {
            await this.ensureIdentityVerified(addr);
        }
    }

    async triggerOnchainCcipTransfer(receiver, amount, data = "0x") {
        try {
            if (!this.ccipConsumerAddress) {
                throw new Error("CCIP_CONSUMER_ADDRESS is not set");
            }

            const ccipConsumerAbi = [
                "function onReport(bytes calldata metadata, bytes calldata report) external"
            ];

            const consumer = new ethers.Contract(this.ccipConsumerAddress, ccipConsumerAbi, this.wallet);
            const report = ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint256", "bytes"],
                [receiver, amount, data]
            );

            console.log(`[Blockchain Service] Sending real on-chain CCIP instruction via consumer=${this.ccipConsumerAddress}`);
            const tx = await consumer.onReport("0x", report);
            const rcpt = await tx.wait();

            return {
                mode: 'onchain-ccip',
                consumer: this.ccipConsumerAddress,
                txHash: rcpt.hash
            };
        } catch (error) {
            console.error('[Blockchain Service] On-chain CCIP trigger failed:', error.message);
            throw error;
        }
    }

    async ensureCcipSenderToken(tokenAddress, senderAddressOverride) {
        try {
            const senderAddress =
                senderAddressOverride ||
                this.ccipSenderAddress ||
                process.env.CCIP_SENDER_ADDRESS ||
                process.env.CCIP_SENDER ||
                this.getContractsEnvValue('CCIP_SENDER');

            if (!senderAddress) {
                throw new Error("CCIP_SENDER_ADDRESS is not set");
            }
            if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
                throw new Error("Valid tokenAddress is required");
            }

            this.ccipSenderAddress = senderAddress;
            await this.ensureCcipInfraIdentity();

            const senderAbi = [
                "function router() view returns (address)",
                "function linkToken() view returns (address)",
                "function rwaToken() view returns (address)",
                "function fujiChainSelector() view returns (uint64)",
                "function destinationReceiver() view returns (address)",
                "function payFeesInLink() view returns (bool)",
                "function setConfig(address router_, address linkToken_, address rwaToken_, uint64 fujiChainSelector_, address destinationReceiver_, bool payFeesInLink_) external"
            ];

            const sender = new ethers.Contract(senderAddress, senderAbi, this.wallet);
            const currentToken = await sender.rwaToken();
            if ((currentToken || '').toLowerCase() === tokenAddress.toLowerCase()) {
                return {
                    updated: false,
                    sender: senderAddress,
                    token: currentToken
                };
            }

            const [router, linkToken, fujiChainSelector, destinationReceiver, payFeesInLink] = await Promise.all([
                sender.router(),
                sender.linkToken(),
                sender.fujiChainSelector(),
                sender.destinationReceiver(),
                sender.payFeesInLink()
            ]);

            const tx = await sender.setConfig(
                router,
                linkToken,
                tokenAddress,
                fujiChainSelector,
                destinationReceiver,
                payFeesInLink
            );
            const rcpt = await tx.wait();

            return {
                updated: true,
                sender: senderAddress,
                previousToken: currentToken,
                token: tokenAddress,
                txHash: rcpt.hash
            };
        } catch (error) {
            console.error('[Blockchain Service] ensureCcipSenderToken failed:', error.message);
            throw error;
        }
    }

    runCreLocalSimulation(workflowFolder, payload) {
        const creRoot = path.join(repoRoot, 'packages/contracts/aura-hardhat/cre-workflows');
        const contractsEnvFile = path.join(repoRoot, 'packages/contracts/.env');

        const env = { ...process.env };
        const userProfile = env.USERPROFILE || '';
        const localFallback = userProfile ? path.join(userProfile, 'AppData', 'Local') : '';
        const roamingFallback = userProfile ? path.join(userProfile, 'AppData', 'Roaming') : '';
        const localAppData = env.LOCALAPPDATA || env.LocalAppData || localFallback;
        const appData = env.APPDATA || roamingFallback;
        if (localAppData) {
            env.LOCALAPPDATA = localAppData;
            env.LocalAppData = localAppData;
        }
        if (appData) {
            env.APPDATA = appData;
        }

        const args = [
            '-e',
            contractsEnvFile,
            '-T',
            'local-simulation',
            'workflow',
            'simulate',
            `./${workflowFolder}`,
            '--non-interactive',
            '--trigger-index',
            '0',
            '--http-payload',
            JSON.stringify(payload)
        ];

        const result = spawnSync('cre', args, {
            cwd: creRoot,
            env,
            encoding: 'utf-8'
        });

        if (result.error) {
            throw result.error;
        }
        if (result.status !== 0) {
            throw new Error(result.stderr || result.stdout || `CRE simulation failed for ${workflowFolder}`);
        }

        return {
            mode: 'local-simulation',
            workflow: workflowFolder,
            output: (result.stdout || '').trim()
        };
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
