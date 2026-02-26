# Protocol Interaction Guide

Follow these steps in order to interact with the AURA protocol on Ethereum Sepolia.

## Prerequisites
- Ensure your `.env` file is populated with the correct contract addresses (automatically done).
- Ensure your `PRIVATE_KEY` has some Sepolia ETH and LINK.

## Step 1: Identity Setup
Verify your wallet in the Identity Registry. This allows you to interact with the compliance-restricted RWA tokens and pools.
```bash
npx hardhat run scripts/interactions/01-setup-identity.ts --network ethereumSepolia
```

## Step 2: Update Oracles
The Liquidity Pool requires fresh NAV (Net Asset Value) and PoR (Proof of Reserve) data. This script manually triggers an update via the Coordinator.
```bash
npx hardhat run scripts/interactions/02-update-oracles.ts --network ethereumSepolia
```

## Step 3: Mint RWA Tokens
Mint the actual digital representations of the real-world assets to your wallet.
```bash
npx hardhat run scripts/interactions/03-mint-tokens.ts --network ethereumSepolia
```

## Step 4: Invest in Pool
Deposit your RWA tokens into the Liquidity Pool to receive Pool Shares.
```bash
npx hardhat run scripts/interactions/04-invest-pool.ts --network ethereumSepolia
```

---

## CRE Workflows
Once the contracts are ready, you can deploy the Chainlink CRE workflows:
```bash
cre workflow deploy nav-por-workflow --target staging
cre workflow deploy ccip-transfer-workflow --target staging
```
