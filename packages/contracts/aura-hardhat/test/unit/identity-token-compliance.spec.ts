import { expect } from "chai";
import { ethers } from "hardhat";

describe("Identity + ERC3643 placeholder gating", function () {
  it("allows verified transfers and blocks unverified receiver", async function () {
    const [admin, alice, bob] = await ethers.getSigners();

    const identity = await (await ethers.getContractFactory("IdentityRegistry")).deploy(admin.address);
    const compliance = await (
      await ethers.getContractFactory("ERC3643ComplianceRegistry")
    ).deploy(admin.address, await identity.getAddress());
    const token = await (
      await ethers.getContractFactory("AuraRwaToken")
    ).deploy("AURA RWA Token", "AURWA", admin.address, await compliance.getAddress());

    await identity.setVerified(admin.address, true);
    await identity.setVerified(alice.address, true);
    await token.mint(alice.address, ethers.parseEther("100"));

    await expect(token.connect(alice).transfer(bob.address, ethers.parseEther("1"))).to.be.revertedWithCustomError(
      token,
      "NonCompliantTransfer"
    );

    await identity.setVerified(bob.address, true);
    await expect(token.connect(alice).transfer(bob.address, ethers.parseEther("1"))).to.not.be.reverted;
  });

  it("enforces mint role restriction", async function () {
    const [admin, outsider] = await ethers.getSigners();
    const identity = await (await ethers.getContractFactory("IdentityRegistry")).deploy(admin.address);
    const compliance = await (
      await ethers.getContractFactory("ERC3643ComplianceRegistry")
    ).deploy(admin.address, await identity.getAddress());
    const token = await (
      await ethers.getContractFactory("AuraRwaToken")
    ).deploy("AURA RWA Token", "AURWA", admin.address, await compliance.getAddress());

    await expect(token.connect(outsider).mint(outsider.address, 1)).to.be.reverted;
  });
});

