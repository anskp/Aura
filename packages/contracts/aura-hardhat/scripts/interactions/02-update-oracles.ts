import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const coordinatorAddress = process.env.COORDINATOR;
    if (!coordinatorAddress) throw new Error("COORDINATOR not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const coordinator = await ethers.getContractAt("OracleUpdateCoordinator", coordinatorAddress);
    console.log("Contract Address (Coordinator):", coordinatorAddress);

    console.log("Triggering manual oracle update (NAV and PoR)...");
    // This will read from the MockOracleProvider (already set during deployment)
    const tx = await coordinator.processScheduledUpdate();
    console.log("Transaction hash:", tx.hash);
    await tx.wait();

    console.log("Oracle update triggered successfully.");

    const navOracleAddress = process.env.NAV_ORACLE;
    const poolId = process.env.POOL_ID;
    if (navOracleAddress && poolId) {
        const navOracle = await ethers.getContractAt("NavOracle", navOracleAddress);
        console.log("Contract Address (NavOracle):", navOracleAddress);
        const [nav, timestamp] = await navOracle.latestNav(poolId);
        console.log(`Latest NAV: ${ethers.formatEther(nav)} at timestamp ${timestamp}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
