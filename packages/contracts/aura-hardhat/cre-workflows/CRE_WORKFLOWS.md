# CRE Workflows (Aura)

This folder contains 2 Chainlink CRE workflows:

1. `nav-por-workflow` (NAV + Proof-of-Reserve report write)
2. `ccip-transfer-workflow` (CCIP transfer report write)

## Folder Structure

```text
cre-workflows/
  project.yaml
  secrets.yaml
  nav-por-workflow/
    workflow.yaml
    main.ts
    config.json
    http_trigger_payload.json
  ccip-transfer-workflow/
    workflow.yaml
    main.ts
    config.json
    http_trigger_payload.json
```

## Prerequisites

1. `node` installed
2. `bun` installed
3. `cre` CLI installed and logged in (`cre login`)

Check:

```powershell
node --version
bun --version
cre version
```

## Env Config

Your env lives at:

- `packages/contracts/.env`

Important keys:

- `CRE_ETH_PRIVATE_KEY`
- `ETHEREUM_SEPOLIA_RPC_URL`
- `AVALANCHE_FUJI_RPC_URL`
- Contract addresses (`ORACLE_CONSUMER`, `CCIP_CONSUMER`, etc.)
- IDs (`POOL_ID`, `ASSET_ID`)

## One-Time Setup

From repo root:

```powershell
cd packages/contracts/aura-hardhat/cre-workflows
```

Install workflow deps:

```powershell
cd nav-por-workflow
bun install
cd ../ccip-transfer-workflow
bun install
cd ..
```

Notes:

- `project.yaml` is required at `cre-workflows` root for CRE target context.
- `secrets.yaml` is required because workflow YAML references it.

## How Each Workflow Works

## `nav-por-workflow`

1. Receives HTTP trigger payload (`nav`, `reserve`).
2. Encodes `(poolId, assetId, nav, reserve, timestamp, reportId)`.
3. Calls CRE report signing (`runtime.report`).
4. Writes report on-chain through EVM client to `oracleConsumerAddress`.

Default test payload file:

- `nav-por-workflow/http_trigger_payload.json`

## `ccip-transfer-workflow`

1. Receives HTTP trigger payload (`receiver`, `amount`, optional `data`).
2. Encodes transfer tuple.
3. Calls CRE report signing (`runtime.report`).
4. Writes report on-chain through EVM client to `ccipConsumerAddress`.

Default test payload file:

- `ccip-transfer-workflow/http_trigger_payload.json`

## Run Local Simulation

Run from:

```powershell
cd packages/contracts/aura-hardhat/cre-workflows
```

Use target:

- `local-simulation`

## Monorepo Dev Integration

Running monorepo dev now also triggers both CRE workflows automatically:

```powershell
pnpm run dev
```

Implementation:

- `packages/contracts/package.json` -> `dev` script
- `packages/contracts/scripts/run-cre-dev.js`

It executes:

1. `nav-por-workflow` simulation
2. `ccip-transfer-workflow` simulation

## Simulate NAV/PoR

```powershell
cre -e ../../.env -T local-simulation workflow simulate ./nav-por-workflow --non-interactive --trigger-index 0 --http-payload '{"nav":"1000000000000000000","reserve":"1000000000000000000000000"}'
```

## Simulate CCIP Transfer

```powershell
cre -e ../../.env -T local-simulation workflow simulate ./ccip-transfer-workflow --non-interactive --trigger-index 0 --http-payload '{"receiver":"0x0000000000000000000000000000000000000001","amount":"1000000000000000000","data":"0x"}'
```

Expected successful output includes:

- `Workflow compiled`
- `Workflow Simulation Result: "0x000...000"` (simulated tx hash in local mode)

## Deploy/Manage (Staging Target)

Use same pattern with `-T staging`:

```powershell
cre -e ../../.env -T staging workflow deploy ./nav-por-workflow
cre -e ../../.env -T staging workflow deploy ./ccip-transfer-workflow
```

Other operations:

```powershell
cre -T staging workflow activate <workflow-folder>
cre -T staging workflow pause <workflow-folder>
cre -T staging workflow delete <workflow-folder>
```

## Common Issues

1. `no project settings file found`
- Make sure `project.yaml` exists at `cre-workflows` root.

2. `target not set`
- Pass `-T local-simulation` (or set `CRE_TARGET`).

3. `no RPC URLs found`
- Ensure RPCs are present in `project.yaml` under chosen target.

4. `Script not found "cre-compile"`
- Run `bun install` in that workflow folder (runs `cre-setup` postinstall).

5. PowerShell breaks `@file` payload syntax
- Use inline JSON payload string (shown above), or quote file argument carefully.
