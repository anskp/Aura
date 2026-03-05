const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy Mock USDC
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const stablecoin = await MockERC20.deploy("Mock USDC", "mUSDC");
    await stablecoin.waitForDeployment();
    console.log("stablecoin:", await stablecoin.getAddress());

    // Deploy Identity
    const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
    const identity = await IdentityRegistry.deploy(deployer.address);
    await identity.waitForDeployment();
    console.log("identity:", await identity.getAddress());

    // Deploy Compliance
    const Compliance = await hre.ethers.getContractFactory("ERC3643ComplianceRegistry");
    const compliance = await Compliance.deploy(deployer.address, await identity.getAddress());
    await compliance.waitForDeployment();
    console.log("compliance:", await compliance.getAddress());

    // Deploy Token Template (for Oracles)
    const Token = await hre.ethers.getContractFactory("AuraRwaToken");
    const token = await Token.deploy("AURA RWA", "AURWA", deployer.address, await compliance.getAddress());
    await token.waitForDeployment();
    console.log("token:", await token.getAddress());

    // Deploy Oracles
    const NavOracle = await hre.ethers.getContractFactory("NavOracle");
    const nav = await NavOracle.deploy(deployer.address);
    await nav.waitForDeployment();
    console.log("navOracle:", await nav.getAddress());

    const ProofOfReserve = await hre.ethers.getContractFactory("ProofOfReserve");
    const por = await ProofOfReserve.deploy(deployer.address, await token.getAddress());
    await por.waitForDeployment();
    console.log("proofOfReserve:", await por.getAddress());

    console.log("--- SUMMARY FOR ENV ---");
    console.log(`VITE_IDENTITY_REGISTRY_ADDRESS=${await identity.getAddress()}`);
    console.log(`VITE_COMPLIANCE_REGISTRY_ADDRESS=${await compliance.getAddress()}`);
    console.log(`VITE_NAV_ORACLE_ADDRESS=${await nav.getAddress()}`);
    console.log(`VITE_POR_ORACLE_ADDRESS=${await por.getAddress()}`);
    console.log(`VITE_STABLECOIN_ADDRESS=${await stablecoin.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
