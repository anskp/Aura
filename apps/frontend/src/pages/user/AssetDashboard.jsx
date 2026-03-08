import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Box, Calendar, MapPin, Tag, Activity, Rocket, List, Loader2, AlertCircle } from 'lucide-react';
import { BlockchainService } from '../../services/blockchain.service';
import { useAuth } from '../../context/AuthContext';
import { ethers } from 'ethers';
import AssetCard from '../../components/marketplace/AssetCard';

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
            const abi = ["function latestNav(bytes32) view returns (uint256, uint256, bytes32)"];
            const navOracle = new ethers.Contract(navOracleAddr, abi, signer);

            const newStaleMap = {};
            for (const asset of assets) {
                if (asset.status === 'LISTED') {
                    try {
                        const poolId = ethers.encodeBytes32String(`POOL_${asset.id}`);
                        const [nav, timestamp] = await navOracle.latestNav(poolId);

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
        const userWallet = user.wallets?.[0]?.address;
        if (!userWallet) {
            alert("Please connect your wallet first.");
            return;
        }

        setDeployingId(asset.id);
        try {
            console.log(`[Non-Custodial] Preparing tokenization for ${asset.name}...`);
            const prep = await api.post(`/assets/prepare-tokenize/${asset.id}`, { userAddress: userWallet });
            const { abi, bytecode, args } = prep.data;

            const signer = await BlockchainService.getSigner();
            const factory = new ethers.ContractFactory(abi, bytecode, signer);

            console.log("[Wallet] Signing deployment transaction...");
            const contract = await factory.deploy(...args);
            await contract.waitForDeployment();
            const tokenAddress = await contract.getAddress();
            const txHash = contract.deploymentTransaction().hash;

            console.log("[Wallet] Linking NavOracle to Token...");
            const navOracleAddr = import.meta.env.VITE_NAV_ORACLE_ADDRESS;
            const poolId = ethers.encodeBytes32String(`POOL_${asset.id}`);
            const linkTx = await contract.setNavOracle(navOracleAddr, poolId);
            await linkTx.wait();

            console.log(`[Blockchain] Token deployed and linked at ${tokenAddress}. Finalizing...`);
            await api.post(`/assets/finalize-tokenize/${asset.id}`, {
                tokenAddress,
                txHash,
                userAddress: userWallet
            });

            fetchAssets();
            alert('AURA RWA Token deployed successfully via your wallet!');
        } catch (err) {
            console.error('[Error] Tokenization failed:', err);
            alert('Tokenization failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeployingId(null);
        }
    };

    const handleListInPool = async (asset) => {
        const userWallet = user.wallets?.[0]?.address;
        if (!userWallet) {
            alert("Please connect your wallet first.");
            return;
        }

        setDeployingId(asset.id);
        try {
            console.log(`[Non-Custodial] Preparing pool deployment for ${asset.name}...`);
            const prep = await api.post(`/assets/prepare-list/${asset.id}`, { userAddress: userWallet });
            const { abi, bytecode, args } = prep.data;

            const signer = await BlockchainService.getSigner();
            const factory = new ethers.ContractFactory(abi, bytecode, signer);

            console.log("[Wallet] Signing Pool deployment transaction...");
            const poolContract = await factory.deploy(...args);
            await poolContract.waitForDeployment();
            const poolAddress = await poolContract.getAddress();
            const deployTxHash = poolContract.deploymentTransaction().hash;

            console.log(`[Blockchain] Pool deployed at ${poolAddress}. Finalizing listing...`);
            await api.post(`/assets/finalize-list/${asset.id}`, {
                poolAddress,
                txHash: deployTxHash,
                userAddress: userWallet
            });

            // Perform Collateralization (Mint -> Approve -> Deposit)
            console.log("[Wallet] Signing Collateralization transactions...");

            // 1. Mint RWA tokens (User is Issuer)
            const tokenAbi = ["function mint(address to, uint256 amount) external", "function approve(address spender, uint256 amount) external"];
            const tokenContract = new ethers.Contract(asset.tokenAddress, tokenAbi, signer);
            const collateralAmount = ethers.parseEther(asset.valuation.toString());

            const mintTx = await tokenContract.mint(userWallet, collateralAmount);
            await mintTx.wait();

            // 2. Approve Pool
            const approveTx = await tokenContract.approve(poolAddress, collateralAmount);
            await approveTx.wait();

            // 3. Deposit Collateral
            const poolAbi = ["function depositCollateral(uint256 amount) external"];
            const lpContract = new ethers.Contract(poolAddress, poolAbi, signer);
            const depositTx = await lpContract.depositCollateral(collateralAmount);
            await depositTx.wait();

            fetchAssets();
            alert('Marketplace listing complete! Pool deployed and collateralized via your wallet.');
        } catch (err) {
            console.error('[Error] Listing failed:', err);
            alert('Listing failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeployingId(null);
        }
    };

    const handleSyncOracle = async (asset) => {
        setDeployingId(asset.id);
        try {
            console.log(`[Action] Manual Sync: Requesting backend to update Oracle for ${asset.name}...`);
            // Sync Oracle stays on backend as it requires Coordinator/Admin roles 
            // and usually relies on backend valuation logic.
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
                                    <div className={`text-center font-bold flex items-center justify-center gap-2 text-xs ${staleMap[asset.id] ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {staleMap[asset.id] ? <AlertCircle size={14} /> : <Box size={14} />}
                                        {staleMap[asset.id] ? 'Stale Oracle Data' : 'Active in Marketplace'}
                                    </div>
                                    <button
                                        className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handleSyncOracle(asset); }}
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
