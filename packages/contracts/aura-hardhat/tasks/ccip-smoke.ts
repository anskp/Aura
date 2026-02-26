import { task } from "hardhat/config";

task("ccip-smoke", "Runs a guarded Sepolia->Fuji CCIP smoke transfer")
  .addParam("sender", "AuraCcipSender address on Sepolia")
  .addParam("receiver", "Receiver wallet on Fuji")
  .addParam("amount", "Amount in wei units")
  .setAction(async (args, hre) => {
    if (process.env.LIVE_CCIP_TESTS !== "true") {
      throw new Error("LIVE_CCIP_TESTS=true is required");
    }

    const sender = await hre.ethers.getContractAt("AuraCcipSender", args.sender);
    const tx = await sender.bridgeToFuji(args.receiver, args.amount, "0x");
    const rcpt = await tx.wait();
    console.log(`ccip-smoke tx hash: ${rcpt?.hash}`);
  });

