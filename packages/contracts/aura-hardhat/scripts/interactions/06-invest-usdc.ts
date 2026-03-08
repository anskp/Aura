import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const poolAddress = process.env.LIQUIDITY_POOL;
    const stablecoinAddress = process.env.STABLECOIN;
    if (!poolAddress) throw new Error("LIQUIDITY_POOL not found in .env");
    if (!stablecoinAddress) throw new Error("STABLECOIN not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const pool = await ethers.getContractAt("LiquidityPool", poolAddress);
    const usdc = await ethers.getContractAt("MockERC20", stablecoinAddress);

    console.log("Contract Address (LiquidityPool):", poolAddress);
    console.log("Contract Address (Mock USDC):", stablecoinAddress);

    const amount = ethers.parseUnits("100", 6); // 100 USDC (6 decimals)

    console.log(`Minting ${ethers.formatUnits(amount, 6)} Mock USDC to ${deployer.address}...`);
    await (await usdc.mint(deployer.address, amount)).wait();

    console.log(`Approving LiquidityPool to spend ${ethers.formatUnits(amount, 6)} USDC...`);
    const approveTx = await usdc.approve(poolAddress, amount);
    await approveTx.wait();

    console.log(`Investing ${ethers.formatUnits(amount, 6)} USDC into the pool...`);
    const investTx = await pool.invest(amount, deployer.address);
    console.log("Investment transaction hash:", investTx.hash);
    await investTx.wait();

    const shares = await pool.balanceOf(deployer.address);
    console.log("Investment successful! Pool share balance (AURAPS):", ethers.formatEther(shares));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
