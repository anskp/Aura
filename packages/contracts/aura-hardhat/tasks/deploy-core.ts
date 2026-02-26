import { task } from "hardhat/config";

task("deploy-core", "Deploys the protocol core stack")
  .addOptionalParam("poolid", "Pool id bytes32", "0x415552415f504f4f4c0000000000000000000000000000000000000000000000")
  .addOptionalParam("assetid", "Asset id bytes32", "0x415552415f415353455400000000000000000000000000000000000000000000")
  .setAction(async (args, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const poolId = args.poolid;
    const assetId = args.assetid;

    const selectorFuji = process.env.FUJI_CHAIN_SELECTOR;
    let sepoliaRouter = process.env.SEPOLIA_ROUTER;
    let fujiRouter = process.env.FUJI_ROUTER;
    let sepoliaLink = process.env.SEPOLIA_LINK;

    if (!selectorFuji) throw new Error("FUJI_CHAIN_SELECTOR is required");

    let localRouterAddress = "";
    let localLinkAddress = "";
    if ((!sepoliaRouter || !fujiRouter || !sepoliaLink) && hre.network.name === "hardhat") {
      const localRouter = await (await hre.ethers.getContractFactory("MockCcipRouter")).deploy();
      await localRouter.waitForDeployment();
      const localLink = await (await hre.ethers.getContractFactory("MockERC20")).deploy("Mock LINK", "LINK");
      await localLink.waitForDeployment();

      localRouterAddress = await localRouter.getAddress();
      localLinkAddress = await localLink.getAddress();
      sepoliaRouter = sepoliaRouter || localRouterAddress;
      fujiRouter = fujiRouter || localRouterAddress;
      sepoliaLink = sepoliaLink || localLinkAddress;
    }
    if (!sepoliaRouter || !fujiRouter || !sepoliaLink) {
      throw new Error("SEPOLIA_ROUTER, FUJI_ROUTER and SEPOLIA_LINK are required");
    }

    const identity = await (await hre.ethers.getContractFactory("IdentityRegistry")).deploy(deployer.address);
    await identity.waitForDeployment();

    const compliance = await (
      await hre.ethers.getContractFactory("ERC3643ComplianceRegistry")
    ).deploy(deployer.address, await identity.getAddress());
    await compliance.waitForDeployment();

    const token = await (
      await hre.ethers.getContractFactory("AuraRwaToken")
    ).deploy("AURA RWA Token", "AURWA", deployer.address, await compliance.getAddress());
    await token.waitForDeployment();

    const nav = await (await hre.ethers.getContractFactory("NavOracle")).deploy(deployer.address);
    await nav.waitForDeployment();

    const por = await (
      await hre.ethers.getContractFactory("ProofOfReserve")
    ).deploy(deployer.address, await token.getAddress());
    await por.waitForDeployment();

    const pool = await (
      await hre.ethers.getContractFactory("LiquidityPool")
    ).deploy(
      deployer.address,
      await token.getAddress(),
      await nav.getAddress(),
      await por.getAddress(),
      poolId,
      assetId
    );
    await pool.waitForDeployment();

    const mockProvider = await (
      await hre.ethers.getContractFactory("MockOracleProvider")
    ).deploy(hre.ethers.parseEther("1"), hre.ethers.parseEther("1000000"));
    await mockProvider.waitForDeployment();

    const coordinator = await (
      await hre.ethers.getContractFactory("OracleUpdateCoordinator")
    ).deploy(
      deployer.address,
      await nav.getAddress(),
      await por.getAddress(),
      await mockProvider.getAddress(),
      poolId,
      assetId
    );
    await coordinator.waitForDeployment();

    const automation = await (
      await hre.ethers.getContractFactory("AutomationFacade")
    ).deploy(deployer.address, await coordinator.getAddress(), 24 * 60 * 60);
    await automation.waitForDeployment();

    const ccipSender = await (
      await hre.ethers.getContractFactory("AuraCcipSender")
    ).deploy(
      deployer.address,
      sepoliaRouter,
      sepoliaLink,
      await token.getAddress(),
      BigInt(selectorFuji),
      process.env.FUJI_RECEIVER ? process.env.FUJI_RECEIVER : deployer.address
    );
    await ccipSender.waitForDeployment();

    const ccipReceiver = await (
      await hre.ethers.getContractFactory("AuraCcipReceiver")
    ).deploy(deployer.address, fujiRouter, await token.getAddress(), await compliance.getAddress());
    await ccipReceiver.waitForDeployment();

    const oracleConsumer = await (
      await hre.ethers.getContractFactory("OracleConsumer")
    ).deploy(deployer.address, await coordinator.getAddress());
    await oracleConsumer.waitForDeployment();

    const ccipConsumer = await (
      await hre.ethers.getContractFactory("CcipConsumer")
    ).deploy(deployer.address, await ccipSender.getAddress());
    await ccipConsumer.waitForDeployment();

    const coordinatorRole = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("COORDINATOR_ROLE"));
    const automationRole = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("AUTOMATION_ROLE"));
    const bridgeRole = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("BRIDGE_ROLE"));
    const updaterRole = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ORACLE_UPDATER_ROLE"));
    const reporterRole = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("REPORTER_ROLE"));
    await (await nav.grantRole(coordinatorRole, await coordinator.getAddress())).wait();
    await (await por.grantRole(coordinatorRole, await coordinator.getAddress())).wait();
    await (await coordinator.grantRole(automationRole, await automation.getAddress())).wait();
    await (await coordinator.grantRole(updaterRole, await oracleConsumer.getAddress())).wait();
    await (await token.grantRole(bridgeRole, await ccipSender.getAddress())).wait();

    const creReporter = process.env.CRE_REPORTER;
    if (creReporter && creReporter.length > 0) {
      await (await oracleConsumer.grantRole(reporterRole, creReporter)).wait();
      await (await ccipConsumer.grantRole(reporterRole, creReporter)).wait();
    }

    await (await identity.setVerified(deployer.address, true)).wait();
    await (await identity.setVerified(await pool.getAddress(), true)).wait();
    await (await identity.setVerified(await ccipReceiver.getAddress(), true)).wait();
    await (await identity.setVerified(await ccipSender.getAddress(), true)).wait();

    console.log("Deployment complete:");
    console.log("identity:", await identity.getAddress());
    console.log("compliance:", await compliance.getAddress());
    console.log("token:", await token.getAddress());
    console.log("navOracle:", await nav.getAddress());
    console.log("proofOfReserve:", await por.getAddress());
    console.log("pool:", await pool.getAddress());
    console.log("mockProvider:", await mockProvider.getAddress());
    console.log("coordinator:", await coordinator.getAddress());
    console.log("automation:", await automation.getAddress());
    console.log("ccipSender:", await ccipSender.getAddress());
    console.log("ccipReceiver:", await ccipReceiver.getAddress());
    console.log("oracleConsumer:", await oracleConsumer.getAddress());
    console.log("ccipConsumer:", await ccipConsumer.getAddress());
    if (creReporter) console.log("creReporter:", creReporter);
    console.log("poolId:", poolId);
    console.log("assetId:", assetId);
  });
