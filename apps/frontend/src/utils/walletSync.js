import api from '../services/api';

const mapChainIdToCode = (chainId) => {
    const id = Number(chainId);
    if (id === 11155111) return 'ETH_SEP';
    if (id === 43113) return 'FUJI';
    if (id === 80002) return 'AMOY';
    return 'UNKNOWN';
};

export const syncActiveWalletToBackend = async (signer) => {
    if (!signer) return null;

    const address = await signer.getAddress();
    const provider = signer.provider;
    const network = await provider.getNetwork();
    const chain = mapChainIdToCode(network.chainId);

    try {
        await api.post('/wallets', { address, chain });
    } catch (err) {
        // Idempotent behavior: ignore if already linked or non-fatal validation noise.
        const msg = err?.response?.data?.error || err?.message || '';
        if (!msg.toLowerCase().includes('already')) {
            console.warn('[Wallet Sync] Unable to sync wallet to backend:', msg);
        }
    }

    return { address, chain };
};
