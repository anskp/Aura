import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import InvestmentModal from '../../components/marketplace/InvestmentModal';

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
    const [isInvestOpen, setIsInvestOpen] = useState(false);
    const [amount, setAmount] = useState('1000');

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

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl mb-8 border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 m-0">Price per Token</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white m-0">$100.00</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-primary mb-1 m-0">{apy}% APY</p>
                                    <p className="text-[10px] text-slate-400 m-0">Yield Paid Monthly</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-slate-500 absolute left-4 top-2 uppercase">Amount (USD)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pt-6 pb-2 px-4 font-black text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] font-bold px-1">
                                    <span className="text-slate-400">You will receive</span>
                                    <span className="text-slate-900 dark:text-white">{projectedTokens} {asset.symbol || 'AURAPS'}</span>
                                </div>
                            </div>
                        </div>

                        {canInvest ? (
                            <button
                                onClick={() => setIsInvestOpen(true)}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 mb-4 border-none cursor-pointer"
                            >
                                <span className="material-symbols-outlined">shopping_cart</span>
                                Buy Shares Now
                            </button>
                        ) : (
                            <button
                                disabled
                                className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold py-4 rounded-xl mb-4 border-none cursor-not-allowed"
                            >
                                Not Listed for Investing
                            </button>
                        )}

                        <button className="w-full bg-white dark:bg-transparent border-2 border-slate-100 dark:border-slate-800 hover:border-primary/20 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-xl transition-all cursor-pointer">
                            Add to Watchlist
                        </button>

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

            {/* Verification Modal Integration */}
            {investAsset && (
                <InvestmentModal
                    asset={investAsset}
                    isOpen={isInvestOpen}
                    onClose={() => setIsInvestOpen(false)}
                    onSuccess={async () => {
                        setIsInvestOpen(false);
                        try {
                            const response = await api.get('/marketplace/pools');
                            const refreshed = (response.data || []).find((p) => Number(p.asset?.id) === Number(assetId));
                            if (refreshed) {
                                setPool(refreshed);
                                setAsset(refreshed.asset);
                            }
                        } catch (error) {
                            console.error('Failed to refresh asset after invest', error);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default AssetDetailsPage;
