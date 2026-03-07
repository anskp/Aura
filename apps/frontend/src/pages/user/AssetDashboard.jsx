import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Box, Calendar, MapPin, Tag, Activity, Rocket, List, Loader2, AlertCircle } from 'lucide-react';
import { BlockchainService } from '../../services/blockchain.service';
import { useAuth } from '../../context/AuthContext';
import { ethers } from 'ethers';

const AssetDashboard = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deployingId, setDeployingId] = useState(null);
    const [staleMap, setStaleMap] = useState({}); // assetId -> boolean (isStale)
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchAssets();
    }, []);

    useEffect(() => {
        if (assets.length > 0) {
            checkOracleFreshness();
        }
    }, [assets]);

    const checkOracleFreshness = async () => {
        try {
            const signer = await BlockchainService.getSigner();
            const navOracleAddr = import.meta.env.VITE_NAV_ORACLE_ADDRESS;
            const abi = ["function latestNav(bytes32) view returns (uint256, uint256)"];
            const navOracle = new ethers.Contract(navOracleAddr, abi, signer);

            const newStaleMap = {};
            for (const asset of assets) {
                if (asset.status === 'LISTED') {
                    try {
                        const poolId = ethers.keccak256(ethers.toUtf8Bytes(asset.name));
                        const [_, timestamp] = await navOracle.latestNav(poolId);

                        const now = Math.floor(Date.now() / 1000);
                        const isStale = (now - Number(timestamp)) > 86400; // 24 hours
                        newStaleMap[asset.id] = isStale || timestamp === 0n;
                    } catch (e) {
                        console.warn(`Failed to check freshness for ${asset.name}:`, e.message);
                        newStaleMap[asset.id] = true; // Assume stale on error
                    }
                }
            }
            setStaleMap(newStaleMap);
        } catch (err) {
            console.error("Freshness check failed:", err);
        }
    };

    const fetchAssets = async () => {
        try {
            const res = await api.get('/assets/my-assets');
            setAssets(res.data);
        } catch (err) {
            console.error('Failed to fetch assets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeployToken = async (asset) => {
        console.log(`[User Action] Initiating tokenization for asset: ${asset.name}`);

        // Defensive check for user wallets
        const userWallet = user.wallets?.[0]?.address;
        if (!userWallet) {
            alert("No wallet connected. Please connect your wallet in the settings or dashboard before tokenizing.");
            return;
        }

        setDeployingId(asset.id);
        try {
            const complianceAddr = import.meta.env.VITE_COMPLIANCE_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";

            // 1. Deploy RWA Stack
            const result = await BlockchainService.deployRwaStack(
                asset.name,
                asset.symbol,
                userWallet, // User becomes the Admin/Issuer
                complianceAddr
            );

            // 2. We NO LONGER mint upfront. 
            // Assets are born with 0 supply, minted only when someone buys.
            console.log(`[Action] Token stack deployed. Supply remains 0 until first investment.`);

            console.log(`[API] Finalizing tokenization in database for asset ${asset.id}...`);
            await api.post(`/assets/finalize-tokenization/${asset.id}`, {
                address: result.tokenAddress,
                symbol: asset.symbol,
                name: asset.name,
                nav: asset.nav,
                por: asset.por,
                navOracle: result.navOracleAddress,
                porContract: result.porAddress
            });
            console.log(`[User Action] Tokenization complete for ${asset.name}`);

            fetchAssets();
            alert('Tokenized successfully! This asset is now ready to be listed in the Marketplace.');
        } catch (err) {
            console.error('[Error] Tokenization failed:', err);
            alert('Deployment/Minting failed: ' + (err.reason || err.message));
        } finally {
            setDeployingId(null);
        }
    };

    const handleListInPool = async (asset) => {
        console.log(`[User Action] Listing asset ${asset.name} in marketplace...`);
        const userWallet = user.wallets?.[0]?.address;
        if (!userWallet) {
            alert("No wallet connected. Please connect your wallet.");
            return;
        }

        setDeployingId(asset.id);
        try {
            const stablecoinAddress = import.meta.env.VITE_STABLECOIN_ADDRESS;
            const navOracleAddress = import.meta.env.VITE_NAV_ORACLE_ADDRESS;
            const porAddress = import.meta.env.VITE_POR_ORACLE_ADDRESS;

            if (!stablecoinAddress || !navOracleAddress || !porAddress) {
                throw new Error("Shared infrastructure (Stablecoin or Oracles) not configured in environment.");
            }

            let poolAddress = asset.pool?.address || asset.address; // Correctly resolve pool address

            // Force Sync: Check if the pool contract actually exists on this network
            const isPoolValid = await BlockchainService.isContract(poolAddress);
            console.log(`[Blockchain] Pool address ${poolAddress} exists: ${isPoolValid}`);

            if (asset.status !== 'LISTED' || !poolAddress || !isPoolValid) {
                console.log(`[Action] ${!isPoolValid ? 'Detected dead Pool address. Force re-deploying...' : 'Deploying new LiquidityPool...'}`);
                poolAddress = await BlockchainService.deployPool(
                    stablecoinAddress,
                    asset.tokenAddress,
                    navOracleAddress,
                    porAddress,
                    ethers.keccak256(ethers.toUtf8Bytes(asset.name)),
                    asset.id,
                    userWallet
                );
            }

            // 2. Backend Oracle Sync (Handling COORDINATOR_ROLE on server)
            console.log(`[Action] Requesting backend to sync Oracle data for ${asset.name}...`);
            try {
                await api.post(`/assets/sync-oracle/${asset.id}`);
                console.log("[Action] Oracle sync successful via Backend.");
            } catch (e) {
                console.warn("[Action] Backend Oracle sync failed/delayed:", e.response?.data?.error || e.message);
                console.info("[Notice] This is usually fine; a system admin will retry the sync shortly.");
            }

            const signer = await BlockchainService.getSigner();

            if (asset.status !== 'LISTED') {
                // 3. Grant ISSUER_ROLE to the Pool
                console.log(`[Action] Granting ISSUER_ROLE to the Pool...`);
                const tokenAbi = [
                    "function grantRole(bytes32 role, address account) external",
                    "function ISSUER_ROLE() view returns (bytes32)"
                ];
                const tokenContract = new ethers.Contract(asset.tokenAddress, tokenAbi, signer);
                const role = await tokenContract.ISSUER_ROLE();
                const tx = await tokenContract.grantRole(role, poolAddress);
                await tx.wait();
            }

            // 4. Ensure user has some Mock USDC for testing (Backend Faucet)
            try {
                const balance = await BlockchainService.getBalance(userWallet, stablecoinAddress);
                if (balance === '0.0') {
                    console.log(`[Action] Requesting Backend Faucet for 1,000 USDC...`);
                    await api.post('/assets/faucet', { address: userWallet });
                }
            } catch (e) {
                console.warn("[Notice] Backend Faucet skipped or failed - likely already has balance.");
            }

            // 5. Finalize or Sync in Backend
            console.log(`[API] ${asset.status === 'LISTED' ? 'Syncing' : 'Finalizing'} marketplace listing for asset ${asset.id}...`);
            await api.post(`/assets/finalize-listing/${asset.id}`, {
                address: poolAddress,
                stablecoinAddress: stablecoinAddress
            });

            console.log(`[User Action] Asset ${asset.name} is now ${asset.status === 'LISTED' ? 'Synced' : 'LIVE'} on marketplace`);
            fetchAssets();
            alert(asset.status === 'LISTED' ? 'Oracle data synced successfully!' : 'Listed in Marketplace successfully!');
        } catch (err) {
            console.error('[Error] Listing failed:', err);
            alert('Listing failed: ' + err.message);
        } finally {
            setDeployingId(null);
        }
    };

    const handleSyncOracle = async (asset) => {
        setDeployingId(asset.id);
        try {
            console.log(`[Action] Manual Sync: Requesting backend to update Oracle for ${asset.name}...`);
            const res = await api.post(`/assets/sync-oracle/${asset.id}`);
            alert("Oracle Synchronization initiated on-chain via Backend!\n\nTX Nav: " + res.data.navHash.slice(0, 10) + "...\nTX Por: " + res.data.porHash.slice(0, 10) + "...");
            fetchAssets();
        } catch (e) {
            console.error(e);
            alert("Sync failed: " + (e.response?.data?.error || e.message));
        } finally {
            setDeployingId(null);
        }
    };

    return (
        <div className="container">
            <header className="flex justify-between items-center mb-8" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>My Assets</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your real-world assets and company entities.</p>
                </div>
                <button onClick={() => navigate('/assets/onboard')} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Onboard New Asset
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading assets...</div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    {assets.map(asset => (
                        <div key={asset.id} className="glass-card" style={{ padding: '1.5rem', transition: 'transform 0.2s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div style={{ background: 'var(--glass)', padding: '0.75rem', borderRadius: '12px', color: 'var(--accent)' }}>
                                    <Box size={24} />
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    background: ['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: ['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status) ? '#10b981' : '#f59e0b',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {asset.status}
                                </span>
                            </div>

                            <h3 style={{ marginBottom: '0.25rem' }}>{asset.name}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{asset.symbol}</p>

                            <div className="space-y-3" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Tag size={14} /> <span>{asset.type}</span>
                                </div>
                                {asset.location && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin size={14} /> <span>{asset.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={14} /> <span>Valuation: ${Number(asset.valuation).toLocaleString()}</span>
                                </div>
                                {asset.companyName && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={14} /> <span>Entity: {asset.companyName}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                                {asset.status === 'APPROVED' && (
                                    <button
                                        className="accent flex items-center justify-center gap-2"
                                        style={{ width: '100%' }}
                                        onClick={() => handleDeployToken(asset)}
                                        disabled={deployingId === asset.id}
                                    >
                                        {deployingId === asset.id ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
                                        Deploy RWA Stack
                                    </button>
                                )}
                                {asset.status === 'TOKENIZED' && (
                                    <button
                                        className="success flex items-center justify-center gap-2"
                                        style={{ width: '100%', background: '#10b981' }}
                                        onClick={() => handleListInPool(asset)}
                                        disabled={deployingId === asset.id}
                                    >
                                        {deployingId === asset.id ? <Loader2 className="animate-spin" size={18} /> : <List size={18} />}
                                        List in Marketplace
                                    </button>
                                )}
                                {asset.status === 'LISTED' && (
                                    <div className="space-y-2">
                                        <div className={`text-center font-bold flex items-center justify-center gap-2 mb-2 ${staleMap[asset.id] ? 'text-amber-500' : 'text-green-400'}`}>
                                            {staleMap[asset.id] ? <AlertCircle size={16} /> : <Box size={16} />}
                                            {staleMap[asset.id] ? 'Stale Oracle Data' : 'Active in Marketplace'}
                                        </div>
                                        {staleMap[asset.id] && (
                                            <p style={{ fontSize: '0.65rem', color: '#f59e0b', textAlign: 'center', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                                Investment might revert until synchronized.
                                            </p>
                                        )}
                                        <button
                                            className={`small flex items-center justify-center gap-2 ${staleMap[asset.id] ? 'accent' : 'secondary'}`}
                                            style={{ width: '100%', fontSize: '0.75rem', opacity: 1, background: staleMap[asset.id] ? 'var(--accent)' : 'transparent' }}
                                            onClick={() => handleSyncOracle(asset)}
                                            disabled={deployingId === asset.id}
                                        >
                                            <Activity size={14} /> Sync On-Chain Data
                                        </button>
                                    </div>
                                )}
                                {asset.status === 'PENDING' && (
                                    <p className="text-center text-xs text-gray-400 italic">Awaiting AI Valuation & Admin Approval</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {assets.length === 0 && (
                        <div className="glass-card col-span-3" style={{ padding: '4rem', textAlign: 'center' }}>
                            <Box size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                            <h3>No assets onboarded yet</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Start by onboarding your first real-world asset.</p>
                            <button onClick={() => navigate('/assets/onboard')} style={{ width: 'auto' }}>
                                Onboard Now
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssetDashboard;
