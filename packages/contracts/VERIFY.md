# Contract Verification Guide

Verify any deployed contract on Sepolia Etherscan with a single command.

## Usage

```bash
npx hardhat verify-contract --address <CONTRACT_ADDRESS> --network sepolia
```

## Examples

```bash
# Identity Registry
npx hardhat verify-contract --address 0xC9CcbF9d29eE599B6A1790112439387a235c0eAe --network sepolia

# Compliance Registry
npx hardhat verify-contract --address 0xa1549874980F2f563d304E995a0cD9C5A7291300 --network sepolia

# RWA Token (with navPrice)
npx hardhat verify-contract --address 0xb99329522A44A489eaB1138ED4266F260c13f5D6 --network sepolia

# NAV Oracle
npx hardhat verify-contract --address 0xaf9E56B5E72C0F159c853DbEdd02245B11133CBF --network sepolia

# Proof of Reserve
npx hardhat verify-contract --address 0xE5D2FaCF85E358A71FaA3d0F775c4CdEB1dccBfD --network sepolia

# Liquidity Pool
npx hardhat verify-contract --address 0xb88621d4011eE95f09410122EFC503aa161e3d77 --network sepolia

# Oracle Update Coordinator
npx hardhat verify-contract --address 0x98714BFfbd70B2DB37214E104e8BD5EF86242080 --network sepolia

# Automation Facade
npx hardhat verify-contract --address 0x6F2897e2Cc270d1C28c30C4509E6CE54A9fa2e7e --network sepolia

# CCIP Sender
npx hardhat verify-contract --address 0x7DeD3e6C49D1bF91857594d00b546D96d3Ff1eBc --network sepolia

# CCIP Receiver
npx hardhat verify-contract --address 0xEa90909566718972cB6A67f87C7723d64a91CACf --network sepolia

# Oracle Consumer
npx hardhat verify-contract --address 0x7f42b6D756bC075724A19e5F9691a3da5e54fa58 --network sepolia

# CCIP Consumer
npx hardhat verify-contract --address 0x033804C03aA014aAb2Eb552BAAe9efeab2BeE5da --network sepolia
```

## How it works

- The task reads constructor args from your `.env` automatically — no manual input needed.
- If the contract is **already verified** → prints ✅ and exits cleanly.
- If the address is **unknown** → lists all registered contracts so you can see what's available.

## Requirements

- `ETHERSCAN_API_KEY` must be set in `.env`
- Address must exist in your `.env` (or be added to `tasks/verify-contract.ts`)

## Adding a new contract

Edit `tasks/verify-contract.ts` and add one line inside `getContractMap()`:

```typescript
["0xYOUR_ADDRESS".toLowerCase(), {
    contract: "contracts/YourContract.sol:YourContract",
    args: [arg1, arg2]
}],
```
