import { expect } from "chai";
import { ethers } from "hardhat";

describe("CCIP local simulation", function () {
  it("bridges tokens through sender/router/receiver path", async function () {
    const [admin, alice, bob] = await ethers.getSigners();

    const identity = await (await ethers.getContractFactory("IdentityRegistry")).deploy(admin.address);
    const compliance = await (
      await ethers.getContractFactory("ERC3643ComplianceRegistry")
    ).deploy(admin.address, await identity.getAddress());
    const token = await (
      await ethers.getContractFactory("AuraRwaToken")
    ).deploy("AURA RWA Token", "AURWA", admin.address, await compliance.getAddress());
    const link = await (await ethers.getContractFactory("MockERC20")).deploy("Mock LINK", "LINK");
    const router = await (await ethers.getContractFactory("MockCcipRouter")).deploy();

    const sender = await (
      await ethers.getContractFactory("AuraCcipSender")
    ).deploy(
      admin.address,
      await router.getAddress(),
      await link.getAddress(),
      await token.getAddress(),
      14767482510784806043n,
      ethers.ZeroAddress
    );
    const receiver = await (
      await ethers.getContractFactory("AuraCcipReceiver")
    ).deploy(admin.address, await router.getAddress(), await token.getAddress(), await compliance.getAddress());

    await sender.setConfig(
      await router.getAddress(),
      await link.getAddress(),
      await token.getAddress(),
      14767482510784806043n,
      await receiver.getAddress(),
      true
    );

    await receiver.setTrustedSender(16015286601757825753n, ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await sender.getAddress()]));

    await identity.setVerified(admin.address, true);
    await identity.setVerified(alice.address, true);
    await identity.setVerified(bob.address, true);
    await identity.setVerified(await receiver.getAddress(), true);
    await identity.setVerified(await sender.getAddress(), true);
    await identity.setVerified(await router.getAddress(), true);

    await token.mint(alice.address, ethers.parseEther("10"));
    await token.connect(alice).approve(await sender.getAddress(), ethers.parseEther("5"));
    await link.mint(await sender.getAddress(), ethers.parseEther("1"));

    await sender.connect(alice).bridgeToFuji(bob.address, ethers.parseEther("5"), "0x");
    await router.deliverLatest(await receiver.getAddress());

    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("5"));
  });
});
