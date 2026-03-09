import * as dotenv from "dotenv";
import { ethers } from "hardhat";
dotenv.config();
async function main(){
  const [dep]=await ethers.getSigners();
  const sender=process.env.CCIP_SENDER!;
  const provider=ethers.provider;
  const depBal=await provider.getBalance(dep.address);
  const senderBal=await provider.getBalance(sender);
  console.log(JSON.stringify({deployer:dep.address,deployerEth:ethers.formatEther(depBal),sender,senderEth:ethers.formatEther(senderBal)},null,2));
}
main().catch((e)=>{console.error(e);process.exit(1);});
