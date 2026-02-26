# Chainlink Runbook

## Automation (daily NAV/PoR)
1. Deploy `AutomationFacade` with `minInterval = 86400`.
2. Grant `AUTOMATION_ROLE` in `OracleUpdateCoordinator` to `AutomationFacade`.
3. Register upkeep for `AutomationFacade.performUpkeep`.
4. Confirm `checkUpkeep` returns true after interval elapses.

## CCIP (Sepolia -> Fuji)
1. Deploy `AuraCcipSender` on Sepolia with Sepolia router and LINK.
2. Deploy `AuraCcipReceiver` on Fuji with Fuji router.
3. Set trusted sender in `AuraCcipReceiver` for Sepolia selector.
4. Fund sender with LINK (if paying fees in LINK) or native gas.
5. Verify receiver and destination addresses in compliance registry.
6. Trigger `bridgeToFuji` from sender.

## Oracle mock pipeline
1. Deploy `MockOracleProvider`.
2. Deploy `OracleUpdateCoordinator` using mock provider.
3. Grant coordinator role in `NavOracle` and `ProofOfReserve`.
4. Call `processScheduledUpdate` manually or via `AutomationFacade`.

