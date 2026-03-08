import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const tokenAddress = process.env.RWA_TOKEN;
    if (!tokenAddress) throw new Error("RWA_TOKEN not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Account:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    const token = await ethers.getContractAt("AuraRwaToken", tokenAddress);
    const issuerRole = await token.ISSUER_ROLE();
    const hasRole = await token.hasRole(issuerRole, deployer.address);
    console.log("Has ISSUER_ROLE:", hasRole);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
