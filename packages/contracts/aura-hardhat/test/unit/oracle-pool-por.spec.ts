import { expect } from "chai";
import { ethers } from "hardhat";

describe("Oracle coordinator + PoR + pool safety", function () {
  async function deployFixture() {
    const [admin, investor] = await ethers.getSigners();

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
    const pool = await (
      await ethers.getContractFactory("LiquidityPool")
    ).deploy(admin.address, await token.getAddress(), await nav.getAddress(), await por.getAddress(), poolId, assetId);

    const coordinatorRole = ethers.keccak256(ethers.toUtf8Bytes("COORDINATOR_ROLE"));
    await nav.grantRole(coordinatorRole, await coordinator.getAddress());
    await por.grantRole(coordinatorRole, await coordinator.getAddress());

    await identity.setVerified(admin.address, true);
    await identity.setVerified(investor.address, true);
    await identity.setVerified(await pool.getAddress(), true);
    await token.mint(investor.address, ethers.parseEther("100"));

    return { admin, investor, token, mock, coordinator, pool, assetId };
  }

  it("rejects malformed oracle payload", async function () {
    const { coordinator } = await deployFixture();
    await expect(coordinator.submitReport("0x1234", "0x")).to.be.revertedWithCustomError(
      coordinator,
      "MalformedPayload"
    );
  });

  it("pauses liquidity operations when reserve < supply", async function () {
    const { investor, token, mock, coordinator, pool, assetId } = await deployFixture();
    await token.connect(investor).approve(await pool.getAddress(), ethers.parseEther("50"));

    const payload = await mock.makePayload.staticCall(ethers.encodeBytes32String("AURA_POOL"), assetId);
    await coordinator.submitReport(payload, "0x");

    await expect(pool.connect(investor).deposit(ethers.parseEther("5"), investor.address)).to.not.be.reverted;

    const reportId = ethers.keccak256(ethers.toUtf8Bytes("low-reserve"));
    const lowReservePayload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "uint256", "uint256", "uint256", "bytes32"],
      [
        ethers.encodeBytes32String("AURA_POOL"),
        assetId,
        ethers.parseEther("1"),
        ethers.parseEther("1"),
        (await ethers.provider.getBlock("latest"))!.timestamp,
        reportId,
      ]
    );
    await coordinator.submitReport(lowReservePayload, "0x");
    await expect(pool.connect(investor).deposit(ethers.parseEther("1"), investor.address)).to.be.revertedWithCustomError(
      pool,
      "SystemPaused"
    );
  });
});
