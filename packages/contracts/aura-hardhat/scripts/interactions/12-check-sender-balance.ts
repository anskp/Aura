import { ethers } from "hardhat";
async function main(){
 const sender="0x127B78815Fe1b40b29934A46EBf21eDe81c7938A";
 const b=await ethers.provider.getBlockNumber();
 const balLatest=await ethers.provider.getBalance(sender);
 const balAt=await ethers.provider.getBalance(sender,10411594);
 console.log(JSON.stringify({block:b,balLatest:ethers.formatEther(balLatest),balAt10411594:ethers.formatEther(balAt)},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
