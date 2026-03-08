const { spawnSync } = require('child_process');
const path = require('path');

const creRoot = path.resolve(__dirname, '../aura-hardhat/cre-workflows');
const envFile = path.resolve(__dirname, '../.env');

const buildCreEnv = () => {
    const env = { ...process.env };

    const userProfile = env.USERPROFILE || '';
    const localFallback = userProfile ? path.join(userProfile, 'AppData', 'Local') : '';
    const roamingFallback = userProfile ? path.join(userProfile, 'AppData', 'Roaming') : '';

    const localAppData = env.LOCALAPPDATA || env.LocalAppData || localFallback;
    const appData = env.APPDATA || roamingFallback;

    if (localAppData) {
        env.LOCALAPPDATA = localAppData;
        env.LocalAppData = localAppData;
    }
    if (appData) {
        env.APPDATA = appData;
    }

    return env;
};

const run = (args, label) => {
    console.log(`[CRE Dev] ${label}`);
    const result = spawnSync('cre', args, {
        cwd: creRoot,
        stdio: 'inherit',
        env: buildCreEnv()
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`Command failed (${label}) with exit code ${result.status}`);
    }
};

const navPayload = JSON.stringify({
    nav: '1000000000000000000',
    reserve: '1000000000000000000000000'
});

const ccipPayload = JSON.stringify({
    receiver: '0x0000000000000000000000000000000000000001',
    amount: '1000000000000000000',
    data: '0x'
});

try {
    run(
        [
            '-e',
            envFile,
            '-T',
            'local-simulation',
            'workflow',
            'simulate',
            './nav-por-workflow',
            '--non-interactive',
            '--trigger-index',
            '0',
            '--http-payload',
            navPayload
        ],
        'Running nav-por-workflow simulation...'
    );

    run(
        [
            '-e',
            envFile,
            '-T',
            'local-simulation',
            'workflow',
            'simulate',
            './ccip-transfer-workflow',
            '--non-interactive',
            '--trigger-index',
            '0',
            '--http-payload',
            ccipPayload
        ],
        'Running ccip-transfer-workflow simulation...'
    );

    console.log('[CRE Dev] Both CRE workflows finished successfully.');
} catch (error) {
    console.error(`[CRE Dev] Failed: ${error.message}`);
    process.exit(1);
}
