const hre = require("hardhat");

async function main() {
    const usdcAddress = "0x015dd8697CdA6091C4071343daCFCFFE90e738B6";
    const userWallet = "0xD941D2a082D9cAc944371F589845AcF83Ff3C547";
    const amount = "10000"; // 10k USDC

    console.log(`Minting ${amount} units to ${userWallet} on Sepolia...`);

    const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);

    // 6 decimals: 10,000 * 10^6
    const amountUnits = hre.ethers.parseUnits(amount, 6);

    const tx = await usdc.mint(userWallet, amountUnits);
    console.log("Transaction Hash:", tx.hash);

    await tx.wait();
    console.log("Success! 10,000 USDC minted to your wallet.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
