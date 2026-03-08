import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Box, Calendar, MapPin, Tag, Activity, Rocket, List, Loader2 } from 'lucide-react';
import { BlockchainService } from '../../services/blockchain.service';
import { useAuth } from '../../context/AuthContext';
import { ethers } from 'ethers';
import AssetCard from '../../components/marketplace/AssetCard';

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
        const userWallet = user.wallets?.[0]?.address;
        if (!userWallet) {
            alert("No wallet connected. Please connect your wallet in the settings or dashboard before tokenizing.");
            return;
        }

        setDeployingId(asset.id);
        try {
            const complianceAddr = import.meta.env.VITE_COMPLIANCE_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";
            const result = await BlockchainService.deployRwaStack(
                asset.name,
                asset.symbol,
                userWallet,
                complianceAddr
            );

            await api.post(`/assets/finalize-tokenization/${asset.id}`, {
                address: result.tokenAddress,
                symbol: asset.symbol,
                name: asset.name,
                nav: asset.nav,
                por: asset.por,
                navOracle: result.navOracleAddress,
                porContract: result.porAddress
            });

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

            let poolAddress = asset.pool?.address || asset.address;
            const isPoolValid = await BlockchainService.isContract(poolAddress);

            if (asset.status !== 'LISTED' || !poolAddress || !isPoolValid) {
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

            const navOracleAbi = ["function setNav(bytes32 poolId, uint256 nav, uint256 timestamp, bytes32 reportId) external"];
            const porOracleAbi = ["function setReserve(bytes32 assetId, uint256 reserve, uint256 timestamp, bytes32 reportId) external"];

            const navOracle = new ethers.Contract(navOracleAddress, navOracleAbi, signer);
            const porOracle = new ethers.Contract(porAddress, porOracleAbi, signer);

            const now = Math.floor(Date.now() / 1000);
            const valuationWei = ethers.parseEther(asset.valuation.toString());

            const navTx = await navOracle.setNav(poolId, valuationWei, now, ethers.ZeroHash);
            await navTx.wait();

            const porTx = await porOracle.setReserve(assetIdBytes32, valuationWei, now, ethers.ZeroHash);
            await porTx.wait();

            if (asset.status !== 'LISTED') {
                const tokenAbi = [
                    "function grantRole(bytes32 role, address account) external",
                    "function ISSUER_ROLE() view returns (bytes32)"
                ];
                const tokenContract = new ethers.Contract(asset.tokenAddress, tokenAbi, signer);
                const role = await tokenContract.ISSUER_ROLE();
                const tx = await tokenContract.grantRole(role, poolAddress);
                await tx.wait();
            }

            try {
                const usdcAbi = ["function mint(address to, uint256 amount) external", "function balanceOf(address account) view returns (uint256)"];
                const usdc = new ethers.Contract(stablecoinAddress, usdcAbi, signer);
                const balance = await usdc.balanceOf(userWallet);
                if (balance === 0n) {
                    const mintTx = await usdc.mint(userWallet, ethers.parseUnits("10000", 6));
                    await mintTx.wait();
                }
            } catch (e) {
                console.log("[Notice] Stablecoin mint skipped.");
            }

            await api.post(`/assets/finalize-listing/${asset.id}`, { address: poolAddress, stablecoinAddress });

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
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-none mb-1">My Assets</h3>
                    <p className="text-slate-500 text-sm">Manage your real-world assets and company entities.</p>
                </div>
                <button
                    onClick={() => navigate('/assets/onboard')}
                    className="btn-primary flex items-center gap-2 border border-primary shadow-none"
                >
                    <Plus size={18} /> Onboard New Asset
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-4 text-slate-500 font-medium">Loading assets...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map(asset => {
                        let customAction;
                        if (asset.status === 'APPROVED') {
                            customAction = (
                                <button
                                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white transition-all shadow-none border-none cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); handleDeployToken(asset); }}
                                    disabled={deployingId === asset.id}
                                >
                                    {deployingId === asset.id ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
                                    Deploy RWA Stack
                                </button>
                            );
                        } else if (asset.status === 'TOKENIZED') {
                            customAction = (
                                <button
                                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-none border-none cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); handleListInPool(asset); }}
                                    disabled={deployingId === asset.id}
                                >
                                    {deployingId === asset.id ? <Loader2 className="animate-spin" size={14} /> : <List size={14} />}
                                    List in Marketplace
                                </button>
                            );
                        } else if (asset.status === 'LISTED') {
                            customAction = (
                                <div className="space-y-2">
                                    <div className="text-center text-emerald-500 font-bold flex items-center justify-center gap-2 text-xs">
                                        <Box size={14} /> Active in Marketplace
                                    </div>
                                    <button
                                        className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handleListInPool(asset); }}
                                        disabled={deployingId === asset.id}
                                    >
                                        <Activity size={14} /> Sync On-Chain Data
                                    </button>
                                </div>
                            );
                        } else {
                            customAction = (
                                <p className="text-center text-xs text-slate-400 italic m-0 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">Awaiting AI Valuation & Admin</p>
                            );
                        }

                        // Provide dummy details for mock if missing
                        const enrichedAsset = {
                            ...asset,
                            valuation: asset.valuation || 0,
                            image: asset.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
                            roi: "15%",
                            cagr: "18%",
                            investmentStrategy: "Capital Growth",
                        };

                        return (
                            <AssetCard
                                key={asset.id}
                                asset={enrichedAsset}
                                isPreview={true}
                                customAction={customAction}
                            />
                        );
                    })}

                    {assets.length === 0 && (
                        <div className="col-span-full bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
                                <Box size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 bg-none">No assets onboarded yet</h3>
                            <p className="text-slate-500 mb-8 max-w-sm">Start tokenizing your real-world assets today by submitting your first asset request.</p>
                            <button
                                onClick={() => navigate('/assets/onboard')}
                                className="btn-primary px-8 border shadow-none"
                            >
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
