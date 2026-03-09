import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function main() {
  const tokenAddr = "0x81C4e4b86F349C744B75dFE023Be27466a787ca2";
  const provider = ethers.provider;
  const erc20 = new ethers.Contract(tokenAddr, [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function poolId() view returns (bytes32)",
    "function assetId() view returns (bytes32)",
    "function bridgeBurn(address,uint256)"
  ], provider);

  const out: any = { tokenAddr };
  for (const fn of ["name","symbol","decimals","totalSupply","poolId","assetId"]) {
    try { out[fn] = String(await (erc20 as any)[fn]()); } catch (e: any) { out[fn] = `ERR: ${e?.shortMessage || e?.message || e}`; }
  }
  try {
    await (erc20 as any).bridgeBurn("0x0000000000000000000000000000000000000001", 1n);
    out.bridgeBurnCall = "ok";
  } catch (e: any) {
    out.bridgeBurnCall = `ERR: ${e?.shortMessage || e?.message || e}`;
  }
  const code = await provider.getCode(tokenAddr);
  out.codeSize = (code.length - 2) / 2;
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e)=>{console.error(e); process.exit(1);});
