import { ethers } from "hardhat";

async function main() {
    const contractAddress = process.env.IDENTITY_REGISTRY;
    if (!contractAddress) {
        console.error("IDENTITY_REGISTRY address not found in .env");
        return;
    }

    console.log(`Checking verified addresses for IdentityRegistry at ${contractAddress}...`);

    try {
        const identityRegistry = await ethers.getContractAt("IdentityRegistry", contractAddress);

        // Get all IdentityUpdated events
        // event IdentityUpdated(address indexed account, bool isVerified);
        const filter = identityRegistry.filters.IdentityUpdated();

        console.log("Querying events from blockchain...");
        const events = await identityRegistry.queryFilter(filter, 0, "latest");

        const verifiedAddresses = new Set<string>();

        for (const event of events) {
            if ("args" in event) {
                const { account, isVerified } = event.args;
                if (isVerified) {
                    verifiedAddresses.add(account);
                } else {
                    verifiedAddresses.delete(account);
                }
            }
        }

        console.log("\nCurrently Verified Wallets:");
        console.log("---------------------------");
        if (verifiedAddresses.size === 0) {
            console.log("No verified addresses found.");
        } else {
            Array.from(verifiedAddresses).forEach((address, index) => {
                console.log(`${index + 1}. ${address}`);
            });
        }
        console.log("---------------------------");
        console.log(`Total Verified: ${verifiedAddresses.size}`);
    } catch (error) {
        console.error("Error querying contract:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
