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

  const identityAddress = req("IDENTITY_REGISTRY");
  const senderAddress = req("CCIP_SENDER");
  const receiverAddress = req("CCIP_RECEIVER");
  const consumerAddress = process.env.CCIP_CONSUMER?.trim();

  const identity = await ethers.getContractAt("IdentityRegistry", identityAddress);
  const addresses = [deployer.address, senderAddress, receiverAddress, consumerAddress].filter(
    (v): v is string => Boolean(v && v.length > 0)
  );

  console.log(`[Identity] Registry: ${identityAddress}`);
  for (const addr of addresses) {
    const verified = await identity.isVerified(addr);
    if (verified) {
      console.log(`[Identity] Already verified: ${addr}`);
      continue;
    }

    const tx = await identity.setVerified(addr, true);
    await tx.wait();
    console.log(`[Identity] Verified: ${addr} (${tx.hash})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

