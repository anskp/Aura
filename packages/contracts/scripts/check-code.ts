import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const addresses = [
        process.env.IDENTITY_REGISTRY,
        process.env.COMPLIANCE_REGISTRY,
        process.env.RWA_TOKEN,
        process.env.NAV_ORACLE,
        process.env.POR_ORACLE,
        process.env.LIQUIDITY_POOL
    ];

    for (const addr of addresses) {
        if (!addr) continue;
        const code = await ethers.provider.getCode(addr);
        console.log(`Address: ${addr}, Code Length: ${code.length}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
