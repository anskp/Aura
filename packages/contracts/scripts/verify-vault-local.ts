import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const addresses = {
    IDENTITY_REGISTRY: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    COMPLIANCE_REGISTRY: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    RWA_TOKEN: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    NAV_ORACLE: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    POR_ORACLE: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    LIQUIDITY_POOL: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    STABLECOIN: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82"
};

function runScript(scriptName: string) {
    console.log(`\n--- Running ${scriptName} ---`);

    const env = { ...process.env, ...addresses };

    try {
        execSync(`npx hardhat run aura-hardhat/scripts/interactions/${scriptName} --network localhost`, {
            stdio: "inherit",
            cwd: "c:/Users/anask/Desktop/convergence/Aura/packages/contracts",
            env
        });
    } catch (e) {
        console.error(`Error running ${scriptName}`);
        process.exit(1);
    }
}

// Order of operations for Vault flow
runScript("03-mint-tokens.ts");       // 1. Mint RWA tokens to issuer
runScript("04-invest-pool.ts");      // 2. Deposit RWA tokens as collateral
runScript("02-update-oracles.ts");    // 3. Update Oracle (NAV) so investment doesn't revert
runScript("06-invest-usdc.ts");     // 4. Invest USDC as investor
