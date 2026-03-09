import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

async function main() {
  const senderAddr = process.env.CCIP_SENDER!;
  const receiverAddr = process.env.CCIP_RECEIVER!;
  const poolAddr = process.env.LIQUIDITY_POOL!;
  const identityAddr = process.env.IDENTITY_REGISTRY!;

  const sender = await ethers.getContractAt("AuraCcipSender", senderAddr);
  const receiver = await ethers.getContractAt("AuraCcipReceiver", receiverAddr);
  const pool = await ethers.getContractAt("LiquidityPool", poolAddr);
  const identity = await ethers.getContractAt("IdentityRegistry", identityAddr);

  const bridgeRole = ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_ROLE"));

  const senderToken = await sender.rwaToken();
  const senderHasRole = await pool.hasRole(bridgeRole, senderAddr);
  const receiverHasRole = await pool.hasRole(bridgeRole, receiverAddr);
  const vPool = await identity.isVerified(poolAddr);
  const vSender = await identity.isVerified(senderAddr);
  const vReceiver = await identity.isVerified(receiverAddr);

  const sourceSelector = BigInt(process.env.SEPOLIA_CHAIN_SELECTOR!);
  const trusted = await receiver.trustedSenders(sourceSelector);
  const expectedTrusted = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [senderAddr]);

  console.log(JSON.stringify({
    sender: senderAddr,
    receiver: receiverAddr,
    pool: poolAddr,
    senderRwaToken: senderToken,
    senderUsesNewPool: senderToken.toLowerCase() === poolAddr.toLowerCase(),
    senderHasBridgeRoleOnPool: senderHasRole,
    receiverHasBridgeRoleOnPool: receiverHasRole,
    identityVerified: {
      pool: vPool,
      sender: vSender,
      receiver: vReceiver
    },
    trustedSenderConfigured: trusted,
    trustedSenderMatches: trusted.toLowerCase() === expectedTrusted.toLowerCase()
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
