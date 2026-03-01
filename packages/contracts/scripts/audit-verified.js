const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
    const rpcUrl = process.env.ETHEREUM_SEPOLIA_RPC_URL;
    const contractAddress = process.env.IDENTITY_REGISTRY;

    if (!rpcUrl || !contractAddress) {
        console.error('Error: Missing ETHEREUM_SEPOLIA_RPC_URL or IDENTITY_REGISTRY in .env');
        process.exit(1);
    }

    console.log(`\nAuditing IdentityRegistry: ${contractAddress}`);
    console.log(`Network: Sepolia via ${new URL(rpcUrl).hostname}`);
    console.log('--------------------------------------------------');

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const abi = require('../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json').abi;
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
        console.log("Connecting to blockchain...");
        const network = await provider.getNetwork();
        console.log(`Connected (Chain ID: ${network.chainId})`);

        const endBlock = await provider.getBlockNumber();
        const startBlock = Math.max(0, endBlock - 50000); // Scan last 50k blocks

        console.log(`Scanning historical verification events from block ${startBlock} to ${endBlock}...`);

        const filter = contract.filters.IdentityUpdated();
        let events = [];
        const chunkSize = 2000;

        for (let from = startBlock; from < endBlock; from += chunkSize) {
            const to = Math.min(from + chunkSize - 1, endBlock);
            process.stdout.write(` - Checking blocks ${from} to ${to}... `);
            try {
                const chunk = await contract.queryFilter(filter, from, to);
                events = events.concat(chunk);
                process.stdout.write(`Done (Found ${chunk.length})\n`);
            } catch (err) {
                process.stdout.write(`Fail (RPC error, skipping range)\n`);
            }
        }

        const verifiedMap = new Map();
        for (const event of events) {
            if (event.args) {
                const { account, isVerified } = event.args;
                verifiedMap.set(account.toLowerCase(), isVerified);
            }
        }

        const verifiedAddresses = [];
        for (const [address, isVerified] of verifiedMap.entries()) {
            if (isVerified) {
                verifiedAddresses.push(address);
            }
        }

        console.log("\nCurrently Verified Wallets:");
        if (verifiedAddresses.length === 0) {
            console.log("No verified wallets found in the scanned range.");
        } else {
            verifiedAddresses.sort().forEach((addr, i) => {
                console.log(`${(i + 1).toString().padStart(2, ' ')}. ${addr}`);
            });
        }
        console.log('--------------------------------------------------');
        console.log(`Total Verified Wallets: ${verifiedAddresses.length}\n`);

    } catch (error) {
        console.error('\nFatal Error:', error.message);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
