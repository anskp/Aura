import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const sender = process.env.CCIP_SENDER;
  if (!sender) throw new Error("CCIP_SENDER is required");

  const amountEth = process.env.CCIP_SENDER_FUND_ETH || "0.05";
  const value = ethers.parseEther(amountEth);

  const tx = await deployer.sendTransaction({
    to: sender,
    value
  });
  await tx.wait();

  console.log(`[Fund] Sender funded: ${sender}`);
  console.log(`[Fund] Amount: ${amountEth} ETH`);
  console.log(`[Fund] Tx: ${tx.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

