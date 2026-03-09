import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

dotenv.config();

function req(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function updateEnvVar(filePath: string, key: string, value: string) {
  const line = `${key}="${value}"`;
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    if (content.length && !content.endsWith("\n")) content += "\n";
    content += `${line}\n`;
  }
  fs.writeFileSync(filePath, content, "utf8");
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const identityRegistry = req("IDENTITY_REGISTRY");
  const stablecoin = req("STABLECOIN");
  const rwaToken = req("RWA_TOKEN");
  const navOracle = req("NAV_ORACLE");
  const porOracle = req("POR_ORACLE");
  const poolId = req("POOL_ID");
  const assetId = req("ASSET_ID");
  const ccipSenderAddress = req("CCIP_SENDER");
  const ccipReceiverAddress = req("CCIP_RECEIVER");
  const sepoliaRouter = req("SEPOLIA_ROUTER");
  const sepoliaLink = req("SEPOLIA_LINK");
  const fujiSelector = BigInt(req("FUJI_CHAIN_SELECTOR"));

  const shareName = process.env.POOL_SHARE_NAME?.trim() || "AURA Pool Share";
  const shareSymbol = process.env.POOL_SHARE_SYMBOL?.trim() || "AURAPS";

  console.log(`[Setup] Network: sepolia`);
  console.log(`[Setup] Deployer: ${deployer.address}`);

  const poolFactory = await ethers.getContractFactory("LiquidityPool");
  const pool = await poolFactory.deploy(
    deployer.address,
    stablecoin,
    rwaToken,
    navOracle,
    porOracle,
    poolId,
    assetId,
    shareName,
    shareSymbol
  );
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  const poolTx = pool.deploymentTransaction();

  console.log(`[Setup] New LiquidityPool: ${poolAddress}`);
  if (poolTx) console.log(`[Setup] Pool deploy tx: ${poolTx.hash}`);

  const bridgeRole = ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_ROLE"));
  const grantSenderTx = await pool.grantRole(bridgeRole, ccipSenderAddress);
  await grantSenderTx.wait();
  const grantReceiverTx = await pool.grantRole(bridgeRole, ccipReceiverAddress);
  await grantReceiverTx.wait();
  console.log(`[Setup] Granted BRIDGE_ROLE to sender: ${grantSenderTx.hash}`);
  console.log(`[Setup] Granted BRIDGE_ROLE to receiver: ${grantReceiverTx.hash}`);

  const sender = await ethers.getContractAt("AuraCcipSender", ccipSenderAddress);
  const destinationReceiver = await sender.destinationReceiver();
  const payFeesInLink = await sender.payFeesInLink();
  const setConfigTx = await sender.setConfig(
    sepoliaRouter,
    sepoliaLink,
    poolAddress,
    fujiSelector,
    destinationReceiver,
    payFeesInLink
  );
  await setConfigTx.wait();
  console.log(`[Setup] Sender reconfigured for pool token: ${setConfigTx.hash}`);

  const identity = await ethers.getContractAt("IdentityRegistry", identityRegistry);
  const addresses = [poolAddress, ccipSenderAddress, ccipReceiverAddress, deployer.address];
  for (const addr of addresses) {
    const ok = await identity.isVerified(addr);
    if (!ok) {
      const tx = await identity.setVerified(addr, true);
      await tx.wait();
      console.log(`[Setup] Identity verified: ${addr} (${tx.hash})`);
    }
  }

  const envPath = path.resolve(__dirname, "../../../.env");
  updateEnvVar(envPath, "LIQUIDITY_POOL", poolAddress);

  console.log("");
  console.log("=== DONE ===");
  console.log(`LIQUIDITY_POOL=${poolAddress}`);
  console.log(`CCIP_SENDER=${ccipSenderAddress}`);
  console.log(`CCIP_RECEIVER=${ccipReceiverAddress}`);
  console.log(`[Setup] Updated ${envPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

