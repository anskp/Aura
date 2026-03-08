const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '../aura-hardhat/cre-workflows');
const workflowDirs = [
    path.join(root, 'nav-por-workflow'),
    path.join(root, 'ccip-transfer-workflow')
];

const runBunInstall = (cwd) => {
    const label = path.basename(cwd);
    console.log(`[CRE Install] bun install -> ${label}`);
    const result = spawnSync('bun', ['install'], {
        cwd,
        stdio: 'inherit',
        env: process.env
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`bun install failed in ${label} with exit code ${result.status}`);
    }
};

try {
    workflowDirs.forEach(runBunInstall);
    console.log('[CRE Install] CRE workflow dependencies installed.');
} catch (error) {
    console.error(`[CRE Install] Failed: ${error.message}`);
    process.exit(1);
}
