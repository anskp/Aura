import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const tokenAddress = process.env.RWA_TOKEN;
    if (!tokenAddress) throw new Error("RWA_TOKEN not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const token = await ethers.getContractAt("AuraRwaToken", tokenAddress);
    console.log("Contract Address (AuraRwaToken):", tokenAddress);

    const amount = ethers.parseEther("1000");
    console.log(`Minting ${ethers.formatEther(amount)} RWA tokens to ${deployer.address}...`);

    try {
        const tx = await token.mint(deployer.address, amount);
        console.log("Transaction hash:", tx.hash);
        await tx.wait();
        console.log("Minting successful!");
    } catch (error: any) {
        console.error("Minting failed!");
        console.error("Error message:", error.message);
        if (error.data) console.error("Error data:", error.data);
        throw error;
    }

    const balance = await token.balanceOf(deployer.address);
    console.log("New balance:", ethers.formatEther(balance));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
