import { ethers } from "hardhat";
async function main(){
 const h="0xa11f92481e8736b937ec87b8bc2c43c67a1aedbd2f902901e31ed1ee0aa308eb";
 const r=await ethers.provider.getTransactionReceipt(h);
 console.log(r ? JSON.stringify({status:r.status,blockNumber:r.blockNumber,to:r.to,from:r.from,gasUsed:r.gasUsed.toString()},null,2) : "no receipt");
 const tx=await ethers.provider.getTransaction(h);
 console.log(tx ? JSON.stringify({value:tx.value.toString(),nonce:tx.nonce,to:tx.to,from:tx.from},null,2) : "no tx");
}
main().catch(e=>{console.error(e);process.exit(1)});
