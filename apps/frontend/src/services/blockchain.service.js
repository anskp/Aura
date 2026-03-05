import { ethers } from 'ethers';
import contractData from '../contracts/contracts.json';

export const BlockchainService = {
    async getProvider() {
        let ethereum = window.ethereum;

        // If multiple providers are injected (e.g. MetaMask + Phantom), 
        // use the current one or the first one without forcing MetaMask.
        if (ethereum?.providers) {
            ethereum = ethereum.providers[0];
        }

        if (!ethereum) throw new Error("No crypto wallet found. Please install a web3 wallet like MetaMask or Phantom.");
        return new ethers.BrowserProvider(ethereum);
    },

    async getSigner() {
        const provider = await this.getProvider();
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
