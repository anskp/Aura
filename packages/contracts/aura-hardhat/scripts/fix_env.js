const { ethers } = require('ethers');
const fs = require('fs');
const path = '.env';

console.log('--- Cleaning and Checksumming Addresses ---');

const addressesToFix = [
    'SEPOLIA_ROUTER',
    'SEPOLIA_LINK',
    'FUJI_ROUTER',
    'FUJI_LINK'
];

let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

const newLines = lines.map(line => {
    for (const key of addressesToFix) {
        if (line.trim().startsWith(key + '=')) {
            const parts = line.split('=');
            let val = parts[1].trim();
            // Strip quotes
            if (val.startsWith('\"') && val.endsWith('\"')) {
                val = val.substring(1, val.length - 1);
            } else if (val.startsWith('\'') && val.endsWith('\'')) {
                val = val.substring(1, val.length - 1);
            }

            // Clean non-hex characters
            const cleanHex = val.toLowerCase().replace(/[^0-9a-f]/g, '');
            if (cleanHex.length === 40) {
                try {
                    const checksummed = ethers.getAddress('0x' + cleanHex);
                    console.log(`Fixed ${key}: ${checksummed}`);
                    return `${key}="${checksummed}"`;
                } catch (e) {
                    console.error(`Error checksumming ${key}: ${e.message}`);
                }
            } else {
                console.warn(`Warning: ${key} does not look like a valid address length (${cleanHex.length} hex chars)`);
            }
        }
    }
    return line;
});

fs.writeFileSync(path, newLines.join('\n'));
console.log('--- .env updated ---');
