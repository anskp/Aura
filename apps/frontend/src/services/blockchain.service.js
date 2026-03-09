import { ethers } from 'ethers';
import contractData from '../contracts/contracts.json';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111

export const BlockchainService = {
    /**
     * Resolves the correct Ethereum provider, especially in multi-wallet environments.
     */
    getEthereum() {
        let ethereum = window.ethereum;

        // 1. Handle multi-provider arrays (MetaMask + Coinbase conflict)
        if (ethereum?.providers?.length) {
            ethereum = ethereum.providers.find(p => p.isCoinbaseWallet) ||
                ethereum.providers.find(p => p.isMetaMask) ||
                ethereum.providers[0];
        }

        // 2. Fallback to direct objects (mobile/standalone extensions)
        if (!ethereum?.isCoinbaseWallet && window.coinbaseWalletExtension) {
            ethereum = window.coinbaseWalletExtension;
        }

        if (!ethereum) throw new Error("No crypto wallet found. Please install MetaMask or Coinbase Wallet.");
        return ethereum;
    },

    /**
     * Attempts to switch the wallet to Sepolia. Adds it if missing.
     * Includes a verification loop to ensure the switch "sticks".
     */
    async switchNetwork(ethereum) {
        console.log(`[Blockchain] Requesting network switch to Sepolia (0xaa36a7)...`);
        try {
            // Some wallets (Coinbase) require authorization before they accept switch requests
            await ethereum.request({ method: 'eth_requestAccounts' });

            await ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID }],
            });
            console.log(`[Blockchain] Network switch request sent.`);
        } catch (switchError) {
            if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
                console.log(`[Blockchain] Sepolia not found. Adding network...`);
                try {
                    await ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: SEPOLIA_CHAIN_ID,
                                chainName: 'Sepolia Test Network',
                                rpcUrls: ['https://rpc.sepolia.org'],
                                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                                blockExplorerUrls: ['https://sepolia.etherscan.io'],
                            },
                        ],
                    });
                } catch {
                    throw new Error("Failed to add Sepolia network to your wallet.");
                }
            } else if (switchError.code === 4001) {
                throw new Error("Network switch rejected by user.");
            } else {
                throw new Error(`Cloud not switch network: ${switchError.message}`);
            }
        }

        // Wait for wallet state to propagate
        let retries = 5;
        while (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            console.log(`[Blockchain] Network Check: ${chainId} (Attempt ${6 - retries})`);
            if (chainId.toLowerCase() === SEPOLIA_CHAIN_ID.toLowerCase()) return;
            retries--;
        }
        throw new Error("Network switch timed out. Please switch to Sepolia manually in your wallet.");
    },

    async getProvider() {
        const ethereum = this.getEthereum();
        return new ethers.BrowserProvider(ethereum);
    },

    async getSigner() {
        const ethereum = this.getEthereum();

        // 1. Ensure authorized
        await ethereum.request({ method: 'eth_requestAccounts' });

        // 2. Enforce Sepolia
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID.toLowerCase()) {
            console.log(`[Blockchain] Wrong network detected (${chainId}). Switching...`);
            await this.switchNetwork(ethereum);
        }

        const provider = new ethers.BrowserProvider(ethereum);
        return await provider.getSigner();
    },

    async deployContract(name, args = []) {
        console.log(`[Blockchain] Deploying ${name}...`);
        const { abi, bytecode } = contractData[name];
        const signer = await this.getSigner();
        const factory = new ethers.ContractFactory(abi, bytecode, signer);
        const contract = await factory.deploy(...args);
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        console.log(`[Blockchain] ${name} deployed at: ${address}`);
        return address;
    },

    async deployRwaStack(name, symbol, adminAddress, complianceAddress) {
        console.log(`[Action] Starting RWA Stack deployment for ${name}`);

        // Shared Oracles from environment
        const navOracleAddress = import.meta.env.VITE_NAV_ORACLE_ADDRESS;
        const porAddress = import.meta.env.VITE_POR_ORACLE_ADDRESS;

        if (!navOracleAddress || !porAddress) {
            throw new Error("NAV_ORACLE or POR_ORACLE addresses not configured in environment.");
        }

        const tokenAddress = await this.deployContract('AuraRwaToken', [name, symbol, adminAddress, complianceAddress]);

        console.log(`[Action] Linking Token to SHARED NAV Oracle at: ${navOracleAddress}`);
        const signer = await this.getSigner();
        const tokenContract = new ethers.Contract(tokenAddress, contractData['AuraRwaToken'].abi, signer);
        const poolId = ethers.keccak256(ethers.toUtf8Bytes(name));
        const tx = await tokenContract.setNavOracle(navOracleAddress, poolId);
        await tx.wait();
        console.log(`[Action] Token stack complete: ${tokenAddress} (Linked to poolId: ${poolId})`);

        return { tokenAddress, navOracleAddress, porAddress, poolId };
    },

    async deployPool(stablecoinAddress, rwaTokenAddress, navOracleAddress, porAddress, poolId, assetId, adminAddress) {
        console.log(`[Action] Starting Liquidity Pool deployment for RWA: ${rwaTokenAddress}`);

        // Ensure assetId is treated as uint256 bytes32
        const assetIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(assetId), 32);

        const poolAddress = await this.deployContract('LiquidityPool', [
            adminAddress,
            stablecoinAddress,
            rwaTokenAddress,
            navOracleAddress, // shared
            porAddress,       // shared
            poolId,
            assetIdBytes32
        ]);
        console.log(`[Action] Pool deployed and active: ${poolAddress}`);
        return poolAddress;
    },

    async isContract(address) {
        if (!address || address === ethers.ZeroAddress) return false;
        try {
            const provider = await this.getProvider();
            const code = await provider.getCode(address);
            return code !== '0x';
        } catch (e) {
            console.error(`[Blockchain] Error checking code at ${address}:`, e);
            return false;
        }
    }
};
