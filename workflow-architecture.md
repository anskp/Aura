# Aura RWA: Workflow Architecture

A high-level overview of the Aura Real-World Asset (RWA) ecosystem, detailing how smart contracts, Chainlink automation, and cross-chain interoperability work together to bring institutional-grade assets on-chain.

---

## 🏛️ Smart Contract Registry

| Contract | Purpose |
| :--- | :--- |
| **IdentityRegistry** | Manages investor verification (KYC/KYB). |
| **ERC3643ComplianceRegistry** | Enforces transfer rules based on identity and system state. |
| **AuraRwaToken** | The core RWA token (compliant with ERC-3643 hooks). |
| **LiquidityPool** | Enables investors to deposit assets and receive pool shares (AURAPS). |
| **NavOracle** | Stores the Net Asset Value (NAV) price for the tokens. |
| **ProofOfReserve** | Monitors off-chain collateral to ensure the system is healthy. |
| **OracleUpdateCoordinator** | Orchestrates updates from off-chain providers to on-chain oracles. |
| **AuraCcipSender** | Initiates cross-chain transfers via Chainlink CCIP. |
| **AuraCcipReceiver** | Handles incoming cross-chain messages and token minting. |
| **OracleConsumer** | Receives signed reports from Chainlink CRE. |
| **CcipConsumer** | Processes bridge instructions from Chainlink CRE. |
| **AutomationFacade** | Simplifies complex interactions for automation engines. |

---

## ⚙️ Technical Flow: Step-by-Step

### 1. Onboarding & Identity
Before any interaction, users must be verified.
- **Action**: Issuer sets `verified = true` in the `IdentityRegistry`.
- **Impact**: The `ERC3643ComplianceRegistry` now permits this address to hold and transfer tokens.

### 2. Token Issuance
- **Action**: The Issuer calls `mint()` on `AuraRwaToken`.
- **Constraint**: Tokens can only be minted to verified addresses.

### 3. Investment in Pools
- **Action**: Investor calls `deposit()` on `LiquidityPool` with a payment asset (e.g., USDC).
- **Verification**: The pool checks `ProofOfReserve` (system is healthy) and `NavOracle` (price is fresh).
- **On-Chain Check**: The system ensures the investor is in the `IdentityRegistry`.
- **Result**: The investor **actually receives AURAPS tokens** in their crypto wallet. These tokens are their liquid "Proof of Ownership."

### 4. The "Engine" (Chainlink CRE)
The system stays accurate and automated via **Chainlink CRE (Constraint Runtime Engine)**.
- **NAV/PoR Workflow**: Fetches real-world data and pushes signed reports to `OracleConsumer`.
- **CCIP Workflow**: Listens for bridge requests and triggers `AuraCcipSender`.

### 5. Cross-Chain Interoperability (CCIP)
- **Action**: User calls `bridgeToFuji()` on `AuraCcipSender`.
- **Process**: CCIP locks tokens on the source chain and sends a message to the destination chain.
- **Result**: `AuraCcipReceiver` mints the corresponding tokens on the target chain.

---

## 📖 Story Mode: The Journey of Aura

### Act 1: The Issuer's Vision
"Alice," an institutional Issuer, wants to tokenize a $10M real estate fund. 
1. She deploys the **AuraRwaToken**.
2. She sets up the **IdentityRegistry** to ensure only verified "Whale" investors can participate.
3. She **mints** the first 10 million tokens to her treasury.

### Act 2: The Investor's Entry
"Bob" is a verified investor who wants to buy in.
1. Bob connects his wallet. The system checks the **IdentityRegistry**—he's verified!
2. Bob goes to the **LiquidityPool**. He sees the price is $1.02 per token.
3. He deposits $102,000 USDC. The pool checks the **ProofOfReserve**—the real estate is still there!
4. **Token Delivery**: Bob's wallet instantly receives 100,000 **AURAPS tokens**. He doesn't just see a number on a website; he actually holds the tokens in his Metamask/wallet as proof he owns part of the fund.

### Act 3: The Engine's Pulse
Behind the scenes, the **Chainlink CRE** acts like a 24/7 heart monitor.
1. Every few hours, the **CRE Workflow** wakes up.
2. It checks the latest real-world appraisals (NAV) and bank balances (PoR).
3. It signs a report and sends it to the **OracleUpdateCoordinator**.
4. Alice and Bob always see the most accurate price on-chain.

### Act 4: Scaling Borders
Bob wants to use his tokens on another chain (e.g., Avalanche Fuji) for a DeFi loan.
1. Bob clicks "Bridge" on the Aura portal.
2. The **AuraCcipSender** takes his tokens and sends a secure signal through **Chainlink CCIP**.
3. Moments later, Bob sees his tokens appear on Fuji, ready to be used. The **AuraCcipReceiver** has minted them for him!

---

## � RWA Asset vs. Pool Shares (AURAPS)

One of the most important concepts is the difference between the **Asset** and the **Ownership Share**.

| Concept | The "Real" Asset (RWA Token) | The "Share" (AURAPS) |
| :--- | :--- | :--- |
| **Who creates it?** | Minted by the **Issuer**. | Minted by the **Liquidity Pool**. |
| **Where does it live?** | Locked inside the **Liquidity Pool** vault. | Stored in the **Investor's wallet**. |
| **The Action** | **You (Issuer)** deposit 100 RWA tokens into the Pool. | **The Pool** mints 10 AURAPS to the Investor. |
| **Proof of Ownership**| The backing/collateral. | The digital "receipt" or claim ticket. |

### The "Vault" Scenario
Imagine you are an Issuer with **1,000 RWA tokens**:
1. You take **100 RWA tokens** and lock them inside the **Liquidity Pool**. 
2. The Pool now acts as a high-security vault holding those 100 assets.
3. An Investor comes and buys $10 worth of ownership.
4. The Pool **mints 10 new AURAPS tokens** and sends them directly to the Investor's wallet.
5. **The original RWA tokens NEVER leave the vault.** They stay there to back the value of the 10 shares the investor is holding.

---

## �📊 NAV and PoR: The Safety Net
- **NAV (Net Asset Value)**: Tells the contract exactly how much 1 token is worth based on the underlying asset's value.
- **PoR (Proof of Reserve)**: A "Circuit Breaker." If the collateral disappears off-chain, the PoR oracle tells the `LiquidityPool` to pause deposits/withdrawals to protect investors.
