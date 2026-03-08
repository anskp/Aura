const prisma = require('../config/prisma');
const assetService = require('./asset.service');

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const runOracleSyncCycle = async () => {
    const candidates = await prisma.asset.findMany({
        where: {
            tokenAddress: { not: null },
            status: { in: ['APPROVED', 'TOKENIZED', 'LISTED'] }
        },
        select: { id: true, name: true }
    });

    if (!candidates.length) {
        console.log('[Oracle Scheduler] No eligible assets found for NAV/PoR sync.');
        return;
    }

    console.log(`[Oracle Scheduler] Starting NAV/PoR sync for ${candidates.length} assets...`);
    for (const asset of candidates) {
        try {
            await assetService.syncAssetOracle(asset.id);
            console.log(`[Oracle Scheduler] Synced asset ${asset.id} (${asset.name}).`);
        } catch (error) {
            console.error(`[Oracle Scheduler] Failed asset ${asset.id}: ${error.message}`);
        }
    }
};

const startOracleScheduler = () => {
    const enabled = parseBool(process.env.ORACLE_AUTO_SYNC_ENABLED, false);
    if (!enabled) {
        console.log('[Oracle Scheduler] Disabled (set ORACLE_AUTO_SYNC_ENABLED=true to enable).');
        return null;
    }

    const intervalMs = parsePositiveInt(
        process.env.ORACLE_AUTO_SYNC_INTERVAL_MS,
        24 * 60 * 60 * 1000
    );

    const runOnStartup = parseBool(process.env.ORACLE_AUTO_SYNC_RUN_ON_STARTUP, true);

    console.log(`[Oracle Scheduler] Enabled. Interval: ${intervalMs} ms.`);
    if (runOnStartup) {
        runOracleSyncCycle().catch((error) => {
            console.error('[Oracle Scheduler] Initial run failed:', error.message);
        });
    }

    return setInterval(() => {
        runOracleSyncCycle().catch((error) => {
            console.error('[Oracle Scheduler] Scheduled run failed:', error.message);
        });
    }, intervalMs);
};

module.exports = {
    startOracleScheduler
};
