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

function gatherEnvAddresses(): string[] {
  const out = new Set<string>();
  for (const [key, raw] of Object.entries(process.env)) {
    if (!raw) continue;
    const value = String(raw).trim();
    if (key.endsWith("_PRIVATE_KEY") || key === "PRIVATE_KEY") continue;
    if (!value.startsWith("0x")) continue;
    if (!ethers.isAddress(value)) continue;
    out.add(value);
  }
  return Array.from(out);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const identityAddress = req("IDENTITY_REGISTRY");
  const identity = await ethers.getContractAt("IdentityRegistry", identityAddress);

  const addresses = gatherEnvAddresses();

  // Ensure operator/deployer is verified as well.
  if (!addresses.includes(deployer.address)) {
    addresses.push(deployer.address);
  }

  console.log(`[Identity] Registry: ${identityAddress}`);
  console.log(`[Identity] Candidate addresses: ${addresses.length}`);

  let added = 0;
  let already = 0;
  for (const addr of addresses) {
    const verified = await identity.isVerified(addr);
    if (verified) {
      already += 1;
      console.log(`[Identity] Already verified: ${addr}`);
      continue;
    }

    const tx = await identity.setVerified(addr, true);
    await tx.wait();
    added += 1;
    console.log(`[Identity] Verified: ${addr} (${tx.hash})`);
  }

  console.log(`[Identity] Done. Added=${added}, Already=${already}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

