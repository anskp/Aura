import { task } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Hardhat task to verify any deployed contract on Etherscan.
 * It auto-detects the contract name and constructor args from the address.
 *
 * Usage:
 *   npx hardhat verify-contract --address <ADDRESS> --network sepolia
 *
 * Example:
 *   npx hardhat verify-contract --address 0xaf9E56B5E72C0F159c853DbEdd02245B11133CBF --network sepolia
 */

const e = process.env;

// Map of address → { contract: full path, args: constructor arguments }
// Args are loaded lazily from .env so they always reflect current values
function getContractMap() {
    const admin = "0x5537dbc19eeE936A615B151c8C5983FBF735C583";
    const identity = e.IDENTITY_REGISTRY ?? "";
    const compliance = e.COMPLIANCE_REGISTRY ?? "";
    const token = e.RWA_TOKEN ?? "";
    const nav = e.NAV_ORACLE ?? "";
    const por = e.POR_ORACLE ?? "";
    const pool = e.LIQUIDITY_POOL ?? "";
    const mock = e.MOCK_PROVIDER ?? "";
    const coord = e.COORDINATOR ?? "";
    const automation = e.AUTOMATION_REGISTRY ?? "";
    const ccipSender = e.CCIP_SENDER ?? "";
    const ccipRecv = e.CCIP_RECEIVER ?? "";
    const oracleC = e.ORACLE_CONSUMER ?? "";
    const ccipC = e.CCIP_CONSUMER ?? "";
    const poolId = e.POOL_ID ?? "";
    const assetId = e.ASSET_ID ?? "";
    const fujiChainSelector = e.FUJI_CHAIN_SELECTOR ?? "";
    const fujiRouter = e.FUJI_ROUTER ?? "";
    const sepoliaRouter = e.SEPOLIA_ROUTER ?? "";
    const sepoliaLink = e.SEPOLIA_LINK ?? "";

    return new Map([
        [identity.toLowerCase(), { contract: "contracts/IdentityRegistry.sol:IdentityRegistry", args: [admin] }],
        [compliance.toLowerCase(), { contract: "contracts/ERC3643ComplianceRegistry.sol:ERC3643ComplianceRegistry", args: [admin, identity] }],
        [token.toLowerCase(), { contract: "contracts/AuraRwaToken.sol:AuraRwaToken", args: ["AURA RWA Token", "AURWA", admin, compliance] }],
        [nav.toLowerCase(), { contract: "contracts/NavOracle.sol:NavOracle", args: [admin] }],
        [por.toLowerCase(), { contract: "contracts/ProofOfReserve.sol:ProofOfReserve", args: [admin, token] }],
        [pool.toLowerCase(), { contract: "contracts/LiquidityPool.sol:LiquidityPool", args: [admin, token, nav, por, poolId, assetId] }],
        [mock.toLowerCase(), { contract: "contracts/mocks/MockOracleProvider.sol:MockOracleProvider", args: ["1000000000000000000", "1000000000000000000000000"] }],
        [coord.toLowerCase(), { contract: "contracts/OracleUpdateCoordinator.sol:OracleUpdateCoordinator", args: [admin, nav, por, mock, poolId, assetId] }],
        [automation.toLowerCase(), { contract: "contracts/AutomationFacade.sol:AutomationFacade", args: [admin, coord, "86400"] }],
        [ccipSender.toLowerCase(), { contract: "contracts/AuraCcipSender.sol:AuraCcipSender", args: [admin, sepoliaRouter, sepoliaLink, token, fujiChainSelector, admin] }],
        [ccipRecv.toLowerCase(), { contract: "contracts/AuraCcipReceiver.sol:AuraCcipReceiver", args: [admin, fujiRouter, token, compliance] }],
        [oracleC.toLowerCase(), { contract: "contracts/OracleConsumer.sol:OracleConsumer", args: [admin, coord] }],
        [ccipC.toLowerCase(), { contract: "contracts/CcipConsumer.sol:CcipConsumer", args: [admin, ccipSender] }],
    ]);
}

task("verify-contract", "Verify a deployed contract on Etherscan by address")
    .addParam("address", "The deployed contract address to verify")
    .setAction(async ({ address }, hre) => {
        const contractMap = getContractMap();
        const key = address.toLowerCase();
        const entry = contractMap.get(key);

        if (!entry) {
            console.log(`\n❌ Unknown address: ${address}`);
            console.log("\nKnown contracts (from .env):");
            contractMap.forEach((val, addr) => {
                console.log(`  ${addr}  →  ${val.contract.split(":")[1]}`);
            });
            throw new Error(`Address ${address} not found in contract map. Add it to tasks/verify-contract.ts if it is a new contract.`);
        }

        console.log(`\n🔍 Verifying: ${entry.contract.split(":")[1]}`);
        console.log(`   Address : ${address}`);
        console.log(`   Args    : ${JSON.stringify(entry.args)}\n`);

        try {
            await hre.run("verify:verify", {
                address,
                contract: entry.contract,
                constructorArguments: entry.args,
            });
            console.log(`\n✅ Verification submitted successfully!`);
        } catch (err: any) {
            const msg: string = err.message ?? "";
            const alreadyDone =
                msg.includes("Already Verified") ||
                msg.includes("already been verified") ||
                msg.includes("full match");
            if (alreadyDone) {
                console.log(`\n✅ Contract is already verified on Etherscan!`);
            } else {
                console.error(`\n❌ Verification error: ${msg}`);
                throw err;
            }
        }
    });
