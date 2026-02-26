import { expect } from "chai";
import { ethers } from "hardhat";

describe("CCIP live smoke (Sepolia -> Fuji)", function () {
  it("is explicitly gated by LIVE_CCIP_TESTS=true", async function () {
    if (process.env.LIVE_CCIP_TESTS !== "true") {
      return;
    }

    const senderAddress = process.env.SEPOLIA_SENDER_ADDRESS;
    const receiverAddress = process.env.FUJI_RECEIVER_WALLET;
    if (!senderAddress || !receiverAddress) {
      throw new Error("SEPOLIA_SENDER_ADDRESS and FUJI_RECEIVER_WALLET are required");
    }

    const sender = await ethers.getContractAt("AuraCcipSender", senderAddress);
    await expect(sender.bridgeToFuji(receiverAddress, 1n, "0x")).to.not.be.reverted;
  });
});

