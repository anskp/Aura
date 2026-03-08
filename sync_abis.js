const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'c:/Users/anask/Desktop/convergence/Aura/packages/contracts/artifacts/contracts';
const OUTPUT_PATH = 'c:/Users/anask/Desktop/convergence/Aura/apps/frontend/src/contracts/contracts.json';

const contractsToSync = [
    'AuraRwaToken',
    'LiquidityPool',
    'NavOracle',
    'ProofOfReserve',
    'IdentityRegistry',
    'MockUSDC'
];

const main = () => {
    const registry = {};

    contractsToSync.forEach(name => {
        let jsonPath;
        if (name === 'MockUSDC') {
            jsonPath = path.join(ARTIFACTS_DIR, 'mocks', 'MockUSDC.sol', 'MockUSDC.json');
        } else {
            jsonPath = path.join(ARTIFACTS_DIR, name + '.sol', name + '.json');
        }

        if (fs.existsSync(jsonPath)) {
            const artifact = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            registry[name] = {
                abi: artifact.abi,
                bytecode: artifact.bytecode
            };
            console.log(`Synced ${name}`);
        } else {
            console.warn(`Warning: Artifact for ${name} not found at ${jsonPath}`);
        }
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
    console.log(`Contracts registry updated at ${OUTPUT_PATH}`);
};

main();
