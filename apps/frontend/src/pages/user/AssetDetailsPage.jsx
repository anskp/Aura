import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import contractData from '../../contracts/contracts.json';
import { BlockchainService } from '../../services/blockchain.service';
import { syncActiveWalletToBackend } from '../../utils/walletSync';
import { ethers } from 'ethers';
import { Loader2, CheckCircle2, Info, Wallet, ArrowRight, ExternalLink } from 'lucide-react';

// High-quality local assets
import rwaInterior from '../../assets/rwa_interior.png';
import rwaLobby from '../../assets/rwa_lobby.png';
import rwaAmenities from '../../assets/rwa_amenities.png';
import metalPlaceholder from '../../assets/metal_placeholder.png';

const fallbackImage = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80';
const ETHERSCAN_BASE = import.meta.env.VITE_ETHERSCAN_BASE_URL || 'https://sepolia.etherscan.io/address/';

const AssetDetailsPage = () => {
    const { assetId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [pool, setPool] = useState(location.state?.pool || null);
    const [asset, setAsset] = useState(location.state?.asset || location.state?.pool?.asset || null);
    const [loading, setLoading] = useState(!location.state?.pool && !location.state?.asset);
    const [amount, setAmount] = useState('1000');

    // Investment states
    const [investmentStatus, setInvestmentStatus] = useState('IDLE'); // IDLE, APPROVING, DEPOSITING, SUCCESS
    const [walletBalance, setWalletBalance] = useState('0');
    const [oracleStatus, setOracleStatus] = useState({ fresh: true, lastUpdate: '' });
    const [healthStatus, setHealthStatus] = useState({ paused: false, healthy: true });
    const [txHash, setTxHash] = useState('');
    const [revertHelp, setRevertHelp] = useState(null);
    const [isFetchingDiagnostics, setIsFetchingDiagnostics] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (pool || asset) return;
            setLoading(true);
            try {
                const idNum = Number(assetId);
                const [poolsRes, myAssetsRes] = await Promise.all([
                    api.get('/marketplace/pools'),
                    api.get('/assets/my-assets')
                ]);
                const matchedPool = (poolsRes.data || []).find((p) => Number(p.asset?.id) === idNum) || null;
                const matchedAsset = (myAssetsRes.data || []).find((a) => Number(a.id) === idNum) || null;

                if (matchedPool) {
                    setPool(matchedPool);
                    setAsset(matchedPool.asset);
                } else if (matchedAsset) {
                    setAsset(matchedAsset);
                }
            } catch (error) {
                console.error('Failed to load asset details', error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [assetId, pool, asset]);

    const fetchDiagnostics = async () => {
        if (!pool || isFetchingDiagnostics) return;
        setIsFetchingDiagnostics(true);
        try {
            const signer = await BlockchainService.getSigner();
            const synced = await syncActiveWalletToBackend(signer);
            const userAddress = synced?.address || await signer.getAddress();

            // 1. Verify Contract Existence
            const isValid = await BlockchainService.isContract(pool.stablecoinAddress);
            if (!isValid) {
                setWalletBalance('0');
                return;
            }

            // 2. Fetch USDC Balance
            const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
            const usdc = new ethers.Contract(pool.stablecoinAddress, usdcAbi, signer);
            const bal = await usdc.balanceOf(userAddress);
            setWalletBalance(ethers.formatUnits(bal, 6));

            // 3. Fetch Oracle Status
            const navOracleAddr = import.meta.env.VITE_NAV_ORACLE_ADDRESS;
            const poolId = ethers.encodeBytes32String(`POOL_${asset.id}`);
            const navOracleAbi = ["function latestNav(bytes32) view returns (uint256, uint256, bytes32)"];
            const navOracle = new ethers.Contract(navOracleAddr, navOracleAbi, signer);
            const [, timestamp] = await navOracle.latestNav(poolId);

            const lastDate = new Date(Number(timestamp) * 1000);
            const isFresh = (Date.now() / 1000) - Number(timestamp) < 86400 * 2;
            setOracleStatus({
                fresh: isFresh && timestamp > 0n,
                lastUpdate: timestamp > 0n ? lastDate.toLocaleString() : 'Never'
            });

            // 4. Fetch PoR health
            const porOracleAddr = import.meta.env.VITE_POR_ORACLE_ADDRESS;
            const assetIdStr = ethers.encodeBytes32String(`ASSET_${asset.id}`);
            const porAbi = [
                "function isPaused() view returns (bool)",
                "function isSystemHealthy(bytes32 assetId) view returns (bool)"
            ];
            const por = new ethers.Contract(porOracleAddr, porAbi, signer);
            const [paused, healthy] = await Promise.all([
                por.isPaused(),
                por.isSystemHealthy(assetIdStr)
            ]);
            setHealthStatus({ paused, healthy });
        } catch (e) {
            console.error("Failed to fetch diagnostics:", e);
        } finally {
            setIsFetchingDiagnostics(false);
        }
    };

    useEffect(() => {
        if (pool) fetchDiagnostics();
    }, [pool?.id]);

    const handleInvest = async () => {
        if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount');
        if (!pool) return alert('Pool not found');

        setInvestmentStatus('APPROVING');
        setRevertHelp(null);
        try {
            const signer = await BlockchainService.getSigner();
            await syncActiveWalletToBackend(signer);
            const amountWei = ethers.parseUnits(amount, 6);

            const stablecoinAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
            const stablecoinContract = new ethers.Contract(pool.stablecoinAddress, stablecoinAbi, signer);
            const approveTx = await stablecoinContract.approve(pool.address, amountWei);
            await approveTx.wait();

            setInvestmentStatus('DEPOSITING');
            const poolContract = new ethers.Contract(pool.address, contractData['LiquidityPool'].abi, signer);
            const depositTx = await poolContract.invest(amountWei, await signer.getAddress());
            const receipt = await depositTx.wait();

            setTxHash(receipt.hash);

            let mintedSharesRaw = 0n;
            let investedAssetsRaw = amountWei;
            for (const log of receipt.logs || []) {
                try {
                    const parsed = poolContract.interface.parseLog(log);
                    if (parsed?.name === 'PoolInvested') {
                        investedAssetsRaw = parsed.args?.assets ?? amountWei;
                        mintedSharesRaw = parsed.args?.shares ?? 0n;
                        break;
                    }
                } catch { }
            }

            await api.post(`/assets/invest/${pool.id}`, {
                investorAddress: await signer.getAddress(),
                amountPaid: Number(ethers.formatUnits(investedAssetsRaw, 6)),
                sharesReceived: Number(ethers.formatEther(mintedSharesRaw)),
                txHash: receipt.hash
            });

            setInvestmentStatus('SUCCESS');
            fetchDiagnostics(); // Refresh balance
        } catch (err) {
            console.error('Investment failed:', err);
            const errorData = err.data || err.error?.data || "";
            if (errorData.includes("0x8645d5f9") || err.message?.includes("0x8645d5f9")) {
                setRevertHelp({
                    title: "Stale Oracle Data",
                    message: "The pool rejected this trade because the on-chain price (NAV) has not been updated recently.",
                    solution: "An Admin must Sync On-Chain Data for this asset."
                });
            } else if (errorData.includes("0x729e4c40") || err.message?.includes("SystemPaused")) {
                setRevertHelp({
                    title: "Protocol Paused",
                    message: "Proof-of-Reserve is unhealthy or paused for this asset.",
                    solution: "Sync oracle data for this asset, then retry."
                });
            } else {
                setRevertHelp({
                    title: "Investment failed",
                    message: err.reason || err.message,
                    solution: "Check your balance and KYC status."
                });
            }
            setInvestmentStatus('IDLE');
        }
    };

    const handleGetTokens = async () => {
        try {
            setInvestmentStatus('MINTING');
            const signer = await BlockchainService.getSigner();
            const address = await signer.getAddress();
            await api.post('/assets/faucet', { address });
            await fetchDiagnostics();
        } catch (e) {
            alert("Faucet failed: " + (e.response?.data?.error || e.message));
        } finally {
            setInvestmentStatus('IDLE');
        }
    };

    const handleSyncOracle = async () => {
        try {
            setInvestmentStatus('SYNCING');
            await api.post(`/assets/sync-oracle/${asset.id}`);
            await fetchDiagnostics();
            setRevertHelp(null);
        } catch (e) {
            alert("Oracle sync failed: " + (e.response?.data?.error || e.message));
        } finally {
            setInvestmentStatus('IDLE');
        }
    };

    const canInvest = useMemo(() => {
        if (!pool || !asset) return false;
        return ['LISTED', 'OPEN'].includes(String(asset.status || '').toUpperCase()) || Boolean(pool.address);
    }, [pool, asset]);

    const projectedTokens = useMemo(() => {
        const n = Number(amount || 0);
        if (!Number.isFinite(n) || n <= 0) return '0.00';
        return n.toFixed(2);
    }, [amount]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="ml-4 text-slate-500 font-medium">Loading asset details...</p>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
                <h3 className="text-lg font-bold m-0 mb-2">Asset not found</h3>
                <p className="text-slate-500 m-0 mb-5">This asset may not be listed yet.</p>
                <button type="button" onClick={() => navigate('/discover')} className="px-6 py-2 bg-primary text-white rounded-lg font-bold">
                    Back to Discover
                </button>
            </div>
        );
    }

    const mainImage = asset.image || fallbackImage;
    const valuation = Number(asset.valuation || asset.nav || 0);
    const tvl = Number(pool?.totalLiquidity || 0);
    const apy = valuation > 0 ? Math.min(15, Math.max(4, (tvl / valuation) * 100 + 5)).toFixed(2) : '8.20';

    // 2 secondary images slots as requested
    const secondaryImages = asset.type === 'METAL'
        ? [metalPlaceholder, metalPlaceholder]
        : [rwaInterior, rwaLobby];

    const investAsset = pool && {
        ...asset,
        pool,
        address: pool.address,
        stablecoinAddress: pool.stablecoinAddress,
        assetId: asset.id
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Back to Market
                </button>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Fully Managed Asset
                </div>
            </div>

            {/* Premium Image Grid (1 big, 2 small slots) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl relative group border border-slate-200 dark:border-slate-800">
                    <img src={mainImage} alt={asset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                        <p className="m-0 text-xs font-bold uppercase tracking-widest text-primary mb-1">{asset.type || 'RWA ASSET'}</p>
                        <h1 className="text-3xl md:text-5xl font-black leading-tight m-0">{asset.name}</h1>
                        <div className="flex items-center gap-2 mt-2 opacity-90">
                            <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                            <span className="text-sm font-medium">{asset.location || 'Global • Institutional Grade'}</span>
                        </div>
                    </div>
                </div>

                {/* 2 small image slots on the right */}
                <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-4">
                    {secondaryImages.map((img, i) => (
                        <div key={i} className="rounded-xl overflow-hidden relative group border border-slate-200 dark:border-slate-800 aspect-square md:aspect-auto">
                            <img src={img} alt={`Detail ${i + 1}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            {i === 1 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="text-white font-bold text-xs uppercase tracking-wider">+12 Photos</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column (Stats & Details) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Key Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                            <p className="text-[10px] uppercase font-bold text-slate-400 m-0 tracking-widest">AI NAV</p>
                            <p className="text-2xl font-black m-0 mt-1">${valuation.toLocaleString()}</p>
                            <p className="text-primary text-[10px] font-bold mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">trending_up</span> +4.2% (30d)
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                            <p className="text-[10px] uppercase font-bold text-slate-400 m-0 tracking-widest">Projected APY</p>
                            <p className="text-2xl font-black m-0 mt-1 text-primary">{apy}%</p>
                            <p className="text-accent-violet text-[10px] font-bold mt-1">Real Yield</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                            <p className="text-[10px] uppercase font-bold text-slate-400 m-0 tracking-widest">Total Value Locked</p>
                            <p className="text-2xl font-black m-0 mt-1">${tvl.toLocaleString()}</p>
                            <p className="text-slate-400 text-[10px] font-bold mt-1">67% Funded</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
                            <p className="text-[10px] uppercase font-bold text-slate-400 m-0 tracking-widest">Liquidity</p>
                            <p className="text-2xl font-black m-0 mt-1">High</p>
                            <p className="text-primary text-[10px] font-bold mt-1">Pool Active</p>
                        </div>
                    </div>

                    {/* AI Valuation Insights */}
                    <div className="bg-gradient-to-br from-white to-primary/5 dark:from-slate-900 dark:to-primary/10 p-8 rounded-2xl border border-primary/20 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-8xl text-primary">psychology</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl m-0">AI Valuation Insights</h3>
                                    <p className="text-slate-500 text-sm m-0">Powered by Aura Analytics Engine</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                                    <span className="material-symbols-outlined text-xs">verified</span> 96% Confidence
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4 m-0">
                                        The valuation is driven by a 12% increase in local demand and low supply in this segment. Macro factors indicate a resilient appreciation despite market fluctuations.
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="bg-primary/10 px-4 py-2 rounded-lg">
                                            <p className="text-[10px] uppercase font-bold text-primary mb-1 m-0">Sentiment</p>
                                            <p className="font-bold text-slate-900 dark:text-white m-0">Bullish</p>
                                        </div>
                                        <div className="bg-primary/10 px-4 py-2 rounded-lg">
                                            <p className="text-[10px] uppercase font-bold text-primary mb-1 m-0">Vol. Risk</p>
                                            <p className="font-bold text-slate-900 dark:text-white m-0">Low</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Market Price Delta</span>
                                        <span className="font-bold text-primary">+3.8%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full" style={{ width: '85%' }}></div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Aura Liquidity Index</span>
                                        <span className="font-bold text-primary">7.8/10</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full" style={{ width: '78%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Price Performance Chart */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl m-0">Price Performance</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-primary"></span>
                                    <span className="text-xs font-medium text-slate-500">Historical NAV</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full border-2 border-dashed border-primary/60"></span>
                                    <span className="text-xs font-medium text-slate-500">Projected Growth</span>
                                </div>
                            </div>
                        </div>
                        <div className="relative h-[240px] w-full flex items-end gap-1">
                            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] font-bold text-slate-400 -ml-2">
                                <span>${(valuation * 1.2).toLocaleString()}</span>
                                <span>${valuation.toLocaleString()}</span>
                                <span>${(valuation * 0.8).toLocaleString()}</span>
                                <span>${(valuation * 0.6).toLocaleString()}</span>
                                <span>$0</span>
                            </div>
                            <div className="flex-1 ml-12 h-full relative border-l border-b border-slate-100 dark:border-slate-800">
                                <div className="absolute inset-0 flex flex-col justify-between">
                                    <div className="border-t border-slate-50 dark:border-slate-800 w-full"></div>
                                    <div className="border-t border-slate-50 dark:border-slate-800 w-full"></div>
                                    <div className="border-t border-slate-50 dark:border-slate-800 w-full"></div>
                                    <div className="border-t border-slate-50 dark:border-slate-800 w-full"></div>
                                    <div className="h-0"></div>
                                </div>
                                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <path d="M0 80 Q 25 75, 50 40" fill="none" stroke="#218d34" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                                    <path d="M50 40 Q 75 15, 100 5" fill="none" stroke="#218d34" strokeDasharray="4" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                                    <circle cx="50" cy="40" fill="#218d34" r="2"></circle>
                                    <circle cx="50" cy="40" fill="#218d34" fillOpacity="0.1" r="5"></circle>
                                </svg>
                                <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap">
                                    Current: ${valuation.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between ml-12 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>2022</span>
                            <span>2023</span>
                            <span>Q2 2024</span>
                            <span>2025 (Est)</span>
                            <span>2026 (Est)</span>
                        </div>
                    </div>

                    {/* Asset Overview & Specifications */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-8">
                        <div>
                            <h3 className="text-xl font-bold m-0 mb-4">Asset Overview</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                                {asset.description || 'Institutional-grade tokenized real-world asset with compliance-gated trading and on-chain valuation sync. This asset represents high-liquidity fractional ownership backed by legal trust structures.'}
                            </p>
                        </div>
                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-lg font-bold mb-6 m-0">Technical Specifications</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 text-sm">Asset Category</span>
                                    <span className="font-semibold">{asset.type || 'RWA'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 text-sm">Occupancy/Util.</span>
                                    <span className="font-semibold text-primary">98.2%</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 text-sm">Valuation Sync</span>
                                    <span className="font-semibold">Daily AI Update</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 text-sm">Legal Structure</span>
                                    <span className="font-semibold">SPV LLC (Wyoming)</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 text-sm">Token Standard</span>
                                    <span className="font-semibold text-accent-violet">ERC-3643 (T-REX)</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 text-sm">Compliance</span>
                                    <span className="font-semibold">Reg D 506(c)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Investment Card) */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-primary shadow-xl sticky top-24">
                        <h3 className="font-bold text-2xl m-0 mb-2">Invest in Asset</h3>
                        <p className="text-slate-500 text-sm m-0 mb-8">Fractionalize your portfolio with as little as $100.</p>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl mb-6 border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 m-0">Price per Token</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white m-0">$1.00</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-primary mb-1 m-0">{apy}% APY</p>
                                    <p className="text-[10px] text-slate-400 m-0">Yield Paid Monthly</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="flex justify-between items-center mb-1 px-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (USD)</label>
                                        <span className={`text-[10px] font-bold ${Number(walletBalance) < Number(amount) ? 'text-red-500' : 'text-slate-400'}`}>
                                            Balance: {Number(walletBalance).toLocaleString()} USDC
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={investmentStatus !== 'IDLE'}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-black text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:opacity-50"
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] font-bold px-1">
                                    <span className="text-slate-400">You will receive</span>
                                    <span className="text-slate-900 dark:text-white">{amount} {asset.symbol || 'AURAPS'}</span>
                                </div>
                            </div>
                        </div>

                        {investmentStatus === 'SUCCESS' ? (
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-xl mb-6 text-center animate-fade-in">
                                <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 m-0">Investment Successful!</p>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1 font-bold"
                                >
                                    View on Etherscan <ExternalLink size={12} />
                                </a>
                            </div>
                        ) : investmentStatus !== 'IDLE' ? (
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-4 rounded-xl mb-6 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="animate-spin text-blue-500" size={20} />
                                    <div>
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 m-0">
                                            {investmentStatus === 'APPROVING' ? 'Approving USDC...' :
                                                investmentStatus === 'DEPOSITING' ? 'Executing Deposit...' :
                                                    investmentStatus === 'SYNCING' ? 'Syncing Oracle...' :
                                                        investmentStatus === 'MINTING' ? 'Requesting Test USDC...' :
                                                            'Processing...'}
                                        </p>
                                        <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 m-0 mt-0.5">Please confirm in your wallet</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {revertHelp && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-xl mb-6">
                                <p className="text-xs font-bold text-red-700 dark:text-red-400 m-0 mb-1">{revertHelp.title}</p>
                                <p className="text-[10px] text-red-600/80 dark:text-red-400/80 m-0 leading-relaxed">{revertHelp.message}</p>
                                <p className="text-[10px] font-bold text-slate-900 dark:text-white m-0 mt-2">Solution: {revertHelp.solution}</p>
                            </div>
                        )}

                        {canInvest ? (
                            <button
                                onClick={handleInvest}
                                disabled={investmentStatus !== 'IDLE' || Number(walletBalance) < Number(amount)}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 mb-4 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">shopping_cart</span>
                                {investmentStatus !== 'IDLE' ? 'Processing...' : 'Buy Shares Now'}
                            </button>
                        ) : (
                            <button
                                disabled
                                className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold py-4 rounded-xl mb-4 border-none cursor-not-allowed"
                            >
                                Not Listed for Investing
                            </button>
                        )}

                        {Number(walletBalance) === 0 && investmentStatus === 'IDLE' && (
                            <button
                                onClick={handleGetTokens}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl mb-4 transition-all flex items-center justify-center gap-2 border-none cursor-pointer text-xs"
                            >
                                <Wallet size={14} /> Get 1,000 Test USDC
                            </button>
                        )}

                        {!oracleStatus.fresh && investmentStatus === 'IDLE' && (
                            <button
                                onClick={handleSyncOracle}
                                className="w-full bg-amber-500/10 text-amber-600 font-bold py-2 rounded-xl mb-4 text-[10px] flex items-center justify-center gap-2 border border-amber-500/20"
                            >
                                <Info size={12} /> Sync Oracle Data (Stale)
                            </button>
                        )}

                        {/* Contract Addresses */}
                        <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center group/addr">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pool Contract</span>
                                {pool?.address ? (
                                    <a
                                        href={`${ETHERSCAN_BASE}${pool.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-mono font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                                        <span className="material-symbols-outlined text-xs opacity-0 group-hover/addr:opacity-100 transition-opacity">open_in_new</span>
                                    </a>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-300">Not Deployed</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center group/token">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Token Contract</span>
                                {asset?.tokenAddress ? (
                                    <a
                                        href={`${ETHERSCAN_BASE}${asset.tokenAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-mono font-bold text-accent-violet hover:underline flex items-center gap-1"
                                    >
                                        {asset.tokenAddress.slice(0, 6)}...{asset.tokenAddress.slice(-4)}
                                        <span className="material-symbols-outlined text-xs opacity-0 group-hover/token:opacity-100 transition-opacity">open_in_new</span>
                                    </a>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-300">Pending Mint</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-xl">shield</span>
                                <p className="text-[10px] text-slate-500 m-0 leading-relaxed">Fully insured by AURA Guarantee Fund. Principal protected up to $25k per user.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                                <p className="text-[10px] text-slate-500 m-0 leading-relaxed">Legal title held in professional escrow. Managed by institutional trust services.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-accent-violet/5 border border-accent-violet/20 p-5 rounded-2xl">
                        <h4 className="font-bold text-accent-violet text-sm mb-2 flex items-center gap-2 m-0">
                            <span className="material-symbols-outlined text-lg">rocket_launch</span>
                            Secondary Market
                        </h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-4 m-0">Aura tokens are tradable on the P2P Marketplace with 24/7 liquidity and instant结算.</p>
                        <a href="/market" className="text-[10px] font-bold text-accent-violet hover:underline">View Active Orders →</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetailsPage;
