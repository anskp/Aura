import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

function req(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const sepoliaRouter = req("SEPOLIA_ROUTER");
  const sepoliaLink = req("SEPOLIA_LINK");
  const fujiSelector = BigInt(req("FUJI_CHAIN_SELECTOR"));
  const rwaToken = req("RWA_TOKEN");
  const complianceRegistry = req("COMPLIANCE_REGISTRY");
  const identityRegistry = process.env.IDENTITY_REGISTRY?.trim();

  console.log(`[Deploy] Network: sepolia`);
  console.log(`[Deploy] Deployer: ${deployer.address}`);
  console.log(`[Deploy] RWA token: ${rwaToken}`);
  console.log(`[Deploy] Compliance: ${complianceRegistry}`);
  if (identityRegistry) {
    console.log(`[Deploy] Identity registry: ${identityRegistry}`);
  }

  const receiverFactory = await ethers.getContractFactory("AuraCcipReceiver");
  const receiver = await receiverFactory.deploy(
    deployer.address,
    sepoliaRouter,
    rwaToken,
    complianceRegistry
  );
  await receiver.waitForDeployment();
  const receiverAddress = await receiver.getAddress();
  const receiverTx = receiver.deploymentTransaction();

  console.log(`[Deploy] AuraCcipReceiver deployed: ${receiverAddress}`);
  if (receiverTx) {
    console.log(`[Deploy] AuraCcipReceiver tx: ${receiverTx.hash}`);
  }

  const senderFactory = await ethers.getContractFactory("AuraCcipSender");
  const sender = await senderFactory.deploy(
    deployer.address,
    sepoliaRouter,
    sepoliaLink,
    rwaToken,
    fujiSelector,
    receiverAddress
  );
  await sender.waitForDeployment();
  const senderAddress = await sender.getAddress();
  const senderTx = sender.deploymentTransaction();

  console.log(`[Deploy] AuraCcipSender deployed: ${senderAddress}`);
  if (senderTx) {
    console.log(`[Deploy] AuraCcipSender tx: ${senderTx.hash}`);
  }

  const bridgeRole = ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_ROLE"));
  const token = await ethers.getContractAt("AuraRwaToken", rwaToken);

  const grantSenderTx = await token.grantRole(bridgeRole, senderAddress);
  await grantSenderTx.wait();
  console.log(`[Deploy] Granted BRIDGE_ROLE to sender: ${grantSenderTx.hash}`);

  const grantReceiverTx = await token.grantRole(bridgeRole, receiverAddress);
  await grantReceiverTx.wait();
  console.log(`[Deploy] Granted BRIDGE_ROLE to receiver: ${grantReceiverTx.hash}`);

  const sourceSelector = BigInt(req("SEPOLIA_CHAIN_SELECTOR"));
  const encodedSender = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [senderAddress]);
  const trustTx = await receiver.setTrustedSender(sourceSelector, encodedSender);
  await trustTx.wait();
  console.log(`[Deploy] Trusted sender set on receiver: ${trustTx.hash}`);

  if (identityRegistry) {
    const identity = await ethers.getContractAt("IdentityRegistry", identityRegistry);
    const infra = [deployer.address, senderAddress, receiverAddress];
    for (const addr of infra) {
      const isVerified = await identity.isVerified(addr);
      if (!isVerified) {
        const tx = await identity.setVerified(addr, true);
        await tx.wait();
        console.log(`[Deploy] Identity verified: ${addr} (${tx.hash})`);
      } else {
        console.log(`[Deploy] Identity already verified: ${addr}`);
      }
    }
  } else {
    console.log("[Deploy] IDENTITY_REGISTRY not set, skipping identity verification step.");
  }

  console.log("");
  console.log("=== NEW ADDRESSES ===");
  console.log(`CCIP_SENDER=${senderAddress}`);
  console.log(`CCIP_RECEIVER=${receiverAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
