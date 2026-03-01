const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
    const rpcUrl = process.env.ETHEREUM_SEPOLIA_RPC_URL;
    const contractAddress = process.env.IDENTITY_REGISTRY;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const abi = ["function isVerified(address account) external view returns (bool)"];
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const accountsToCheck = [
        { name: "User Wallet", address: "0x5537dbc19eee936a615b151c8c5983fbf735c583" },
        { name: "Deployer", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" }, // Standard Hardhat #1 or your actual deployer
        { name: "Pool", address: "0xb88621d4011eE95f09410122EFC503aa161e3d77" },
        { name: "CCIP Sender", address: "0x7DeD3e6C49D1bF91857594d00b546D96d3Ff1eBc" },
        { name: "CCIP Receiver", address: "0xEa90909566718972cB6A67f87C7723d64a91CACf" }
    ];

    console.log(`\nChecking known system addresses...`);
    for (const acc of accountsToCheck) {
        try {
            const verified = await contract.isVerified(acc.address);
            console.log(`${acc.name.padEnd(15)} (${acc.address}): ${verified ? '✅ Verified' : '❌ Not Verified'}`);
        } catch (err) {
            console.log(`${acc.name.padEnd(15)}: Error checking`);
        }
    }
}

main();
