import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("AURA local integration", function () {
  it("runs issuer->pool->investor lifecycle with automation update", async function () {
    const [admin, issuer, investor] = await ethers.getSigners();

    const identity = await (await ethers.getContractFactory("IdentityRegistry")).deploy(admin.address);
    const compliance = await (
      await ethers.getContractFactory("ERC3643ComplianceRegistry")
    ).deploy(admin.address, await identity.getAddress());
    const token = await (
      await ethers.getContractFactory("AuraRwaToken")
    ).deploy("AURA RWA Token", "AURWA", admin.address, await compliance.getAddress());
    const nav = await (await ethers.getContractFactory("NavOracle")).deploy(admin.address);
    const por = await (await ethers.getContractFactory("ProofOfReserve")).deploy(admin.address, await token.getAddress());
    const mock = await (await ethers.getContractFactory("MockOracleProvider")).deploy(
      ethers.parseEther("1"),
      ethers.parseEther("1000000")
    );
    const poolId = ethers.encodeBytes32String("AURA_POOL");
    const assetId = ethers.encodeBytes32String("AURA_ASSET");
    const coordinator = await (
      await ethers.getContractFactory("OracleUpdateCoordinator")
    ).deploy(admin.address, await nav.getAddress(), await por.getAddress(), await mock.getAddress(), poolId, assetId);
    const automation = await (
      await ethers.getContractFactory("AutomationFacade")
    ).deploy(admin.address, await coordinator.getAddress(), 24 * 60 * 60);
    const pool = await (
      await ethers.getContractFactory("LiquidityPool")
    ).deploy(admin.address, await token.getAddress(), await nav.getAddress(), await por.getAddress(), poolId, assetId);

    const coordinatorRole = ethers.keccak256(ethers.toUtf8Bytes("COORDINATOR_ROLE"));
    const automationRole = ethers.keccak256(ethers.toUtf8Bytes("AUTOMATION_ROLE"));
    const issuerRole = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
    await nav.grantRole(coordinatorRole, await coordinator.getAddress());
    await por.grantRole(coordinatorRole, await coordinator.getAddress());
    await coordinator.grantRole(automationRole, await automation.getAddress());
    await token.grantRole(issuerRole, issuer.address);

    await identity.setVerified(admin.address, true);
    await identity.setVerified(issuer.address, true);
    await identity.setVerified(investor.address, true);
    await identity.setVerified(await pool.getAddress(), true);

    await token.connect(issuer).mint(investor.address, ethers.parseEther("100"));

    await coordinator.processScheduledUpdate();
    await token.connect(investor).approve(await pool.getAddress(), ethers.parseEther("40"));
    await pool.connect(investor).deposit(ethers.parseEther("40"), investor.address);

    const shareBal = await pool.balanceOf(investor.address);
    expect(shareBal).to.be.gt(0n);

    await time.increase(24 * 60 * 60 + 1);
    await automation.performUpkeep("0x");

    const assetsOut = await pool.previewWithdraw(shareBal / 2n);
    await pool.connect(investor).withdraw(shareBal / 2n, investor.address);
    expect(await token.balanceOf(investor.address)).to.be.gte(assetsOut);
  });
});

