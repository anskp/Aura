# CCIP + Portfolio End-to-End Plan

## Goal

Deliver full user flow:

1. User invests in marketplace.
2. User receives on-chain token balance that appears in Portfolio page.
3. User can bridge tokens cross-chain (Sepolia -> Fuji) using CCIP and CRE.

---

## Current State (Codebase Reality)

## What already works

1. `LiquidityPool.invest()` mints pool-share tokens (`AURAPS`) to `receiver`.
2. Frontend investment flow calls `pool.invest(amount, userAddress)` from wallet.
3. Backend records investment in DB (`investment` table) after tx.
4. CCIP contracts exist:
   - `AuraCcipSender`
   - `AuraCcipReceiver`
   - `CcipConsumer`
5. CRE workflows exist:
   - `nav-por-workflow`
   - `ccip-transfer-workflow`

## What is missing / broken for end-to-end product behavior

1. Portfolio page is static mock UI, not live blockchain/DB data.
2. No backend API for portfolio aggregation (wallet balances + positions + tx history).
3. No frontend bridge UX wired to CCIP flow.
4. No backend bridge API that can trigger CRE CCIP workflow for user requests.
5. No persisted bridge-request lifecycle table (requested, submitted, delivered, failed).
6. Network handling is Sepolia-only in frontend wallet service (no Fuji view mode).
7. Deployment flow can misconfigure CCIP sender destination:
   - In `deploy-core`, sender destination falls back to `deployer.address` unless `FUJI_RECEIVER` is set.
8. No operational health checks for critical CCIP config:
   - trusted sender mapping on receiver
   - LINK/native fee funding
   - CRE reporter role wiring

---

## Architecture Decision (Required Clarification)

Invest flow currently mints `AURAPS` (pool shares), not `AuraRwaToken`.

Decision required:

1. Keep this model: Portfolio should display `AURAPS` as user ownership.
2. Or change protocol: mint/show `AuraRwaToken` to investor wallet directly.

Recommended: keep existing model (`AURAPS`) because contracts already implement it.

---

## Implementation Plan

## Phase 1: Portfolio data should be real

### Backend

1. Add `GET /portfolio/summary` endpoint.
2. Aggregate:
   - user wallets from `wallet` table
   - on-chain balances for:
     - stablecoin(s)
     - pool share tokens (each listed pool contract ERC20 balanceOf)
   - DB investments + transactions
3. Return normalized portfolio DTO:
   - `totalValue`
   - `positions[]` (assetId, poolAddress, shares, nav, value)
   - `walletBalances[]`
   - `recentTransactions[]`

### Frontend

1. Replace static `PortfolioWallet.jsx` data with API + chain-backed data.
2. Show actual minted shares from wallet balances.
3. Show investment tx links and statuses from backend transactions.

Acceptance criteria:

1. After invest tx success, refresh Portfolio shows increased pool-share balance.
2. Data matches `pool.balanceOf(user)` for each listed pool.

---

## Phase 2: User bridge request flow (App -> Backend -> CRE -> CCIP)

### Backend

1. Add `bridge_request` table (Prisma migration):
   - `id`, `userId`, `sourceChain`, `destChain`, `receiver`, `amount`, `tokenAddress`,
     `status`, `requestTxHash?`, `ccipMessageId?`, `error?`, timestamps.
2. Add `POST /bridge/request`:
   - validate user ownership/balance
   - persist request
   - trigger CRE CCIP workflow HTTP endpoint with payload:
     `{ receiver, amount, data }`
   - update status.
3. Add `GET /bridge/requests` for user history.
4. Add optional admin retry endpoint for failed requests.

### CRE / Contracts

1. Confirm `ccip-transfer-workflow/config.json` points to deployed `CCIP_CONSUMER`.
2. Ensure `CcipConsumer.REPORTER_ROLE` granted to CRE reporter wallet.
3. Ensure `AuraCcipSender` config:
   - router/link/token/selector set correctly
   - `destinationReceiver` = deployed Fuji `AuraCcipReceiver`.
4. Ensure `AuraCcipReceiver.setTrustedSender` configured for Sepolia sender.

Acceptance criteria:

1. Creating bridge request emits on-chain CCIP tx via CRE path.
2. User can view bridge request lifecycle in app.

---

## Phase 3: Bridge UX in frontend

1. Add bridge modal/page from Portfolio `Swap` button.
2. Form inputs:
   - source token/position
   - destination chain
   - receiver
   - amount
3. Submit to `POST /bridge/request`.
4. Show status timeline:
   - queued
   - submitted
   - delivered / failed

Acceptance criteria:

1. User can submit bridge request without manual contract calls.
2. Status updates visible in UI.

---

## Phase 4: Operational hardening

1. Startup health check endpoint for:
   - required env vars
   - contract addresses non-zero
   - role configuration checks
2. Add monitoring logs for CRE/CCIP failures.
3. Add idempotency key on bridge request creation.
4. Add rate limiting and validation on bridge endpoints.

---

## Required Env and Config Alignment

Align these across backend + contracts + CRE:

1. `RPC_URL`, `PRIVATE_KEY`, oracle/token addresses in backend `.env`.
2. `CHAINLINK_CRE_URL` in backend `.env`.
3. `CCIP_CONSUMER`, `CCIP_SENDER`, `CCIP_RECEIVER`, selectors in contracts `.env`.
4. `cre-workflows/ccip-transfer-workflow/config.json` with latest `ccipConsumerAddress`.

---

## Test Plan

## Unit

1. Backend portfolio aggregation service.
2. Bridge request validation + CRE trigger adapter.

## Integration

1. Invest in pool -> verify on-chain `balanceOf(user)` > 0 -> `/portfolio/summary` reflects it.
2. Bridge request -> CRE trigger called -> request status progression.

## Contract/Chain

1. Existing `ccip/local-simulator.spec.ts` remains green.
2. Add smoke test for `CcipConsumer.onReport -> bridgeToFuji`.

---

## Delivery Order (Recommended)

1. Portfolio API + real Portfolio UI.
2. Bridge request DB/API + CRE trigger integration.
3. Bridge UI.
4. Config validation + test automation.

---

## Immediate Next Task

Implement Phase 1 first (real portfolio data), because it is prerequisite to proving "invest -> token shown in wallet/portfolio" and will make bridge UX trustworthy.
