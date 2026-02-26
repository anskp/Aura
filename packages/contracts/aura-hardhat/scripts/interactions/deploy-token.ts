import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Deploys a fresh AuraRwaToken (with navPrice() built in),
 * links it to the existing NavOracle, and re-grants all required roles.
 *
 * Run: npx hardhat run scripts/interactions/deploy-token.ts --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const complianceAddress = process.env.COMPLIANCE_REGISTRY;
    const navOracleAddress = process.env.NAV_ORACLE;
    const poolId = process.env.POOL_ID;
    const ccipSenderAddress = process.env.CCIP_SENDER;

    if (!complianceAddress || !navOracleAddress || !poolId || !ccipSenderAddress) {
        throw new Error("COMPLIANCE_REGISTRY, NAV_ORACLE, POOL_ID, and CCIP_SENDER must be set in .env");
    }

    // ── 1. Deploy new token ────────────────────────────────────────────────
    console.log("\nDeploying new AuraRwaToken...");
    const Token = await ethers.getContractFactory("AuraRwaToken");
    const token = await Token.deploy(
        "AURA RWA Token",
        "AURWA",
        deployer.address,
        complianceAddress
    );
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ AuraRwaToken deployed at:", tokenAddress);

    // ── 2. Link to NavOracle ───────────────────────────────────────────────
    console.log("\nLinking NavOracle...");
    const tx1 = await token.setNavOracle(navOracleAddress, poolId);
    console.log("  tx:", tx1.hash);
    await tx1.wait();

    // ── 3. Grant BRIDGE_ROLE to CcipSender ────────────────────────────────
    console.log("\nGranting BRIDGE_ROLE to CcipSender...");
    const BRIDGE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_ROLE"));
    const tx2 = await token.grantRole(BRIDGE_ROLE, ccipSenderAddress);
    console.log("  tx:", tx2.hash);
    await tx2.wait();

    // ── 4. Verify navPrice() works ─────────────────────────────────────────
    const [nav, timestamp] = await token.navPrice();
    console.log(`\n✅ navPrice() = ${ethers.formatEther(nav)} (raw: ${nav})`);
    console.log(`   Last update: ${new Date(Number(timestamp) * 1000).toISOString()}`);

    // ── 5. Print summary ──────────────────────────────────────────────────
    console.log("\n==============================");
    console.log("UPDATE YOUR .env:");
    console.log(`RWA_TOKEN="${tokenAddress}"`);
    console.log("==============================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
