import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Links the deployed AuraRwaToken to the NavOracle so that navPrice()
 * is readable directly on Etherscan's Read Contract tab.
 *
 * Run: npx hardhat run scripts/interactions/05-link-nav-oracle.ts --network sepolia
 */
async function main() {
    const tokenAddress = process.env.RWA_TOKEN;
    const navOracleAddress = process.env.NAV_ORACLE;
    const poolId = process.env.POOL_ID;

    if (!tokenAddress || !navOracleAddress || !poolId) {
        throw new Error("RWA_TOKEN, NAV_ORACLE, and POOL_ID must be set in .env");
    }

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);
    console.log("Token:", tokenAddress);
    console.log("NavOracle:", navOracleAddress);
    console.log("PoolId:", poolId);

    const token = await ethers.getContractAt("AuraRwaToken", tokenAddress);

    console.log("\nLinking NavOracle to AuraRwaToken...");
    const tx = await token.setNavOracle(navOracleAddress, poolId);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ NavOracle linked!");

    // Verify it works immediately
    const [nav, timestamp] = await token.navPrice();
    console.log(`\nCurrent NAV Price: ${ethers.formatEther(nav)} (raw: ${nav})`);
    console.log(`Last updated: ${new Date(Number(timestamp) * 1000).toISOString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
