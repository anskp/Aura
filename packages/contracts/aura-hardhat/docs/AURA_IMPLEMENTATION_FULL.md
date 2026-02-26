# AURA Hardhat v1 - Full Implementation Guide

## 1) What is implemented
This project now includes a full `aura-hardhat/` workspace implementing the requested v1 scope:

- ERC-3643 placeholder compliance gate
- Identity registry
- RWA token with compliance-enforced transfers
- NAV oracle + PoR oracle
- Oracle update coordinator with mock provider
- Liquidity pool with NAV-aware share accounting
- Chainlink Automation-compatible facade (`checkUpkeep` / `performUpkeep`)
- Chainlink CCIP sender/receiver adapters
- Deployment task and smoke task
- Unit, integration, and CCIP local simulation tests

## 2) Project structure
Top-level important files/directories:

```text
aura-hardhat/
  contracts/
    AuraCcipReceiver.sol
    AuraCcipSender.sol
    AuraRwaToken.sol
    AutomationFacade.sol
    ERC3643ComplianceRegistry.sol
    IdentityRegistry.sol
    LiquidityPool.sol
    NavOracle.sol
    OracleUpdateCoordinator.sol
    ProofOfReserve.sol
    interfaces/
      IAuraCcipBridge.sol
      IERC3643ComplianceModule.sol
      IIdentityRegistry.sol
      ILiquidityPool.sol
      INavOracle.sol
      IOracleUpdateCoordinator.sol
      IProofOfReserve.sol
    mocks/
      MockCcipRouter.sol
      MockERC20.sol
      MockOracleProvider.sol
  tasks/
    index.ts
    deploy-core.ts
    ccip-smoke.ts
  scripts/
    deploy.ts
  test/
    unit/
      identity-token-compliance.spec.ts
      oracle-pool-por.spec.ts
    integration/
      end-to-end.spec.ts
    ccip/
      local-simulator.spec.ts
      live-smoke.spec.ts
  docs/
    CHAINLINK_RUNBOOK.md
    NETWORKS.md
    AURA_IMPLEMENTATION_FULL.md
  hardhat.config.ts
  package.json
  tsconfig.json
  remappings.txt
  .env.example
  .nvmrc
```

## 3) Dependency and version lock
Pinned in `package.json`:

- `hardhat`: `2.22.17`
- `@chainlink/contracts`: `1.5.0`
- `@chainlink/contracts-ccip`: `1.6.2`
- `@chainlink/local`: `0.2.7-beta.0`
- `@chainlink/env-enc`: `1.0.5`
- `@openzeppelin/contracts`: `5.4.0`
- `hardhat-preprocessor`: `0.1.5`
- `@nomicfoundation/hardhat-ethers`: `3.0.8`
- `@nomicfoundation/hardhat-chai-matchers`: `2.0.8`
- `@nomicfoundation/hardhat-network-helpers`: `1.0.12`
- `@nomicfoundation/hardhat-verify`: `2.0.12`

Node target is pinned by design to `20.x` (`.nvmrc` + `engines`).

## 4) Working scripts and tasks
`package.json` scripts:

- `npm run compile`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:ccip`
- `npm run deploy:local`
- `npm run smoke:ccip -- --sender <SENDER> --receiver <RECEIVER> --amount <WEI>`

Hardhat tasks:

- `deploy-core`
  - Deploys full contract graph
  - Wires roles and initial identity verification
- `ccip-smoke`
  - Guarded CCIP smoke execution (`LIVE_CCIP_TESTS=true`)

## 5) Setup and run (from scratch)
From `aura-hardhat/`:

```bash
nvm use 20
npm install --legacy-peer-deps
npm run compile
npm test
```

For encrypted environment:

```bash
npx env-enc set-pw
npx env-enc set
```

Use keys from `.env.example`.

## 6) Contract responsibilities
- `IdentityRegistry.sol`: verified addresses for compliance.
- `ERC3643ComplianceRegistry.sol`: placeholder transfer policy module.
- `AuraRwaToken.sol`: ERC20 with compliance check hook in `_update`.
- `NavOracle.sol`: stores latest NAV per `poolId`.
- `ProofOfReserve.sol`: stores reserve snapshots and pause-on-underreserve safety.
- `LiquidityPool.sol`: deposits/withdrawals with NAV-based share math + PoR health checks.
- `MockOracleProvider.sol`: deterministic NAV/PoR payload generation for v1.
- `OracleUpdateCoordinator.sol`: single ingestion point for oracle payloads.
- `AutomationFacade.sol`: Chainlink Automation-compatible scheduler trigger.
- `AuraCcipSender.sol`: source-side CCIP bridge call.
- `AuraCcipReceiver.sol`: destination-side CCIP receive + compliance check.

## 7) Test coverage implemented
- Identity + compliance gate behavior.
- Mint role restrictions.
- Oracle payload validation (including malformed payload rejection).
- PoR health pause behavior for liquidity actions.
- Full local integration lifecycle.
- CCIP local simulation (sender/router/receiver/token flow).
- Live CCIP smoke test gating (`LIVE_CCIP_TESTS=true`).

## 8) Current validation result
Executed locally:

- `npm run compile` -> success
- `npm test` -> **7 passing**

## 9) Notes and operational caveats
- This repo was executed under Node `22.x` in this environment; project still enforces Node `20.x` as the supported target.
- If npm 11 peer resolution is strict in your machine, use `npm install --legacy-peer-deps` with this pinned Hardhat 2 stack.
- The previously shared private key should be treated as compromised and rotated before any live deployment.
- Oracle/Gemini integration is intentionally mocked in v1; coordinator interface is ready for phase-2 backend signer flow.
