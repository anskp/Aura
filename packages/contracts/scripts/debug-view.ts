import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const tokenAddress = process.env.RWA_TOKEN;
    if (!tokenAddress) throw new Error("RWA_TOKEN not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Account:", deployer.address);

    const token = await ethers.getContractAt("AuraRwaToken", tokenAddress);

    try {
        console.log("Attempting to call name()...");
        const name = await token.name();
        console.log("Token Name:", name);
    } catch (error: any) {
        console.error("name() failed!");
        console.error(error);
    }

    try {
        console.log("Attempting to call symbol()...");
        const symbol = await token.symbol();
        console.log("Token Symbol:", symbol);
    } catch (error: any) {
        console.error("symbol() failed!");
        console.error(error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
