import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const identityAddress = process.env.IDENTITY_REGISTRY;
    if (!identityAddress) throw new Error("IDENTITY_REGISTRY not found in .env");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const identity = await ethers.getContractAt("IdentityRegistry", identityAddress);
    console.log("Contract Address (IdentityRegistry):", identityAddress);

    console.log("Setting verified status for:", deployer.address);
    const tx = await identity.setVerified(deployer.address, true);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();

    const isVerified = await identity.isVerified(deployer.address);
    console.log("Is verified:", isVerified);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
