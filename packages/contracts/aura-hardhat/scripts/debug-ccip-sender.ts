import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function main() {
  const senderAddr = process.env.CCIP_SENDER!;
  const provider = ethers.provider;
  const abi = [
    "function router() view returns (address)",
    "function linkToken() view returns (address)",
    "function rwaToken() view returns (address)",
    "function fujiChainSelector() view returns (uint64)",
    "function destinationReceiver() view returns (address)",
    "function payFeesInLink() view returns (bool)",
    "function bridgeToFuji(address receiver, uint256 amount, bytes data) returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)"
  ];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];
  const tokenAbi = [
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function balanceOf(address) view returns (uint256)"
  ];
  const routerAbi = [
    "function getFee(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, bytes extraArgs, address feeToken) message) external view returns (uint256)"
  ];

  const sender = await ethers.getContractAt(abi, senderAddr);
  const [router, link, rwa, sel, dst, payInLink] = await Promise.all([
    sender.router(),
    sender.linkToken(),
    sender.rwaToken(),
    sender.fujiChainSelector(),
    sender.destinationReceiver(),
    sender.payFeesInLink(),
  ]);

  const bridgeRole = ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_ROLE"));
  const rwaToken = await ethers.getContractAt(tokenAbi, rwa);
  const hasBridge = await rwaToken.hasRole(bridgeRole, senderAddr);

  const senderEthBal = await provider.getBalance(senderAddr);
  const linkToken = await ethers.getContractAt(erc20Abi, link);
  const [linkBal, linkDec, linkSym] = await Promise.all([
    linkToken.balanceOf(senderAddr),
    linkToken.decimals(),
    linkToken.symbol()
  ]);

  const routerC = await ethers.getContractAt(routerAbi, router);
  const testReceiver = "0x82d9cF8BE44a79d1D089a40700157Ec810AD0A76";
  const testAmount = 7017n;
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes"], [testReceiver, testAmount, "0x"]);
  const msgObj = {
    receiver: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [dst]),
    data: payload,
    tokenAmounts: [],
    extraArgs: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [350000n]),
    feeToken: payInLink ? link : ethers.ZeroAddress,
  };

  let fee: bigint | null = null;
  let feeErr = "";
  try {
    fee = await routerC.getFee(sel, msgObj as any);
  } catch (e: any) {
    feeErr = e?.message || String(e);
  }

  console.log(JSON.stringify({
    senderAddr,
    router,
    link,
    rwa,
    selector: sel.toString(),
    destinationReceiver: dst,
    payFeesInLink: payInLink,
    senderEth: ethers.formatEther(senderEthBal),
    senderLink: `${ethers.formatUnits(linkBal, linkDec)} ${linkSym}`,
    hasBridgeRoleOnToken: hasBridge,
    fee: fee ? fee.toString() : null,
    feeErr,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
