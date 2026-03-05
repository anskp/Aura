import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Box, Calendar, MapPin, Tag, Activity, Rocket, List, Loader2 } from 'lucide-react';
import { BlockchainService } from '../../services/blockchain.service';
import { useAuth } from '../../context/AuthContext';
import { ethers } from 'ethers';

const AssetDashboard = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deployingId, setDeployingId] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchAssets();
    }, []);

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

            const signer = await BlockchainService.getSigner();
            const poolId = ethers.keccak256(ethers.toUtf8Bytes(asset.name));
            const assetIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(asset.id), 32);

            // 2. Bootstrap ORACLE Data (Crucial for avoiding StaleNav error)
            console.log(`[Action] Bootstrapping Oracle data for ${asset.name}...`);
            const navOracleAbi = ["function setNav(bytes32 poolId, uint256 nav, uint256 timestamp, bytes32 reportId) external"];
            const porOracleAbi = ["function setReserve(bytes32 assetId, uint256 reserve, uint256 timestamp, bytes32 reportId) external"];

            const navOracle = new ethers.Contract(navOracleAddress, navOracleAbi, signer);
            const porOracle = new ethers.Contract(porAddress, porOracleAbi, signer);

            const now = Math.floor(Date.now() / 1000);
            const valuationWei = ethers.parseEther(asset.valuation.toString());

            console.log(`[Blockchain] Setting initial NAV: $${asset.valuation}`);
            const navTx = await navOracle.setNav(poolId, valuationWei, now, ethers.ZeroHash);
            await navTx.wait();

            console.log(`[Blockchain] Setting initial Proof of Reserve: $${asset.valuation}`);
            const porTx = await porOracle.setReserve(assetIdBytes32, valuationWei, now, ethers.ZeroHash);
            await porTx.wait();

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

            // 4. Ensure user has some Mock USDC for testing
            try {
                const usdcAbi = [
                    "function mint(address to, uint256 amount) external",
                    "function balanceOf(address account) view returns (uint256)"
                ];
                const usdc = new ethers.Contract(stablecoinAddress, usdcAbi, signer);
                const balance = await usdc.balanceOf(userWallet);
                if (balance === 0n) {
                    console.log(`[Action] Minting 10,000 Mock USDC for testing...`);
                    const mintTx = await usdc.mint(userWallet, ethers.parseUnits("10000", 6));
                    await mintTx.wait();
                }
            } catch (e) {
                console.log("[Notice] Stablecoin mint skipped - likely not a mock contract or already has balance.");
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
                                        <div className="text-center text-green-400 font-bold flex items-center justify-center gap-2 mb-2">
                                            <Box size={16} /> Active in Marketplace
                                        </div>
                                        <button
                                            className="small secondary flex items-center justify-center gap-2"
                                            style={{ width: '100%', fontSize: '0.75rem', opacity: 0.8 }}
                                            onClick={() => handleListInPool(asset)}
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
