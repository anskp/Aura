import hre from "hardhat";

async function main() {
  await hre.run("deploy-core");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
