import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const poolAddress = process.env.LIQUIDITY_POOL;
    const tokenAddress = process.env.RWA_TOKEN;
    if (!poolAddress) throw new Error("LIQUIDITY_POOL not found in .env");
    if (!tokenAddress) throw new Error("RWA_TOKEN not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const pool = await ethers.getContractAt("LiquidityPool", poolAddress);
    const token = await ethers.getContractAt("AuraRwaToken", tokenAddress);
    console.log("Contract Address (LiquidityPool):", poolAddress);
    console.log("Contract Address (AuraRwaToken):", tokenAddress);

    const amount = ethers.parseEther("100");

    console.log(`Approving LiquidityPool to spend ${ethers.formatEther(amount)} RWA tokens...`);
    const approveTx = await token.approve(poolAddress, amount);
    console.log("Approval transaction hash:", approveTx.hash);
    await approveTx.wait();

    console.log(`Depositing ${ethers.formatEther(amount)} RWA tokens into the pool as collateral...`);
    const depositTx = await pool.depositCollateral(amount);
    console.log("Deposit transaction hash:", depositTx.hash);
    await depositTx.wait();

    const poolRwaBalance = await token.balanceOf(poolAddress);
    console.log("Collateral deposit successful! Pool RWA balance:", ethers.formatEther(poolRwaBalance));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
