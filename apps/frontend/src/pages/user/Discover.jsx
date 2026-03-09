import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AssetCard from '../../components/marketplace/AssetCard';
import metalPlaceholder from '../../assets/metal_placeholder.png';

const PLACEHOLDER_BY_TYPE = {
    METAL: metalPlaceholder,
    REAL_ESTATE: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    ART: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=80',
    CARBON: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    OTHER: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80'
};

const resolveImage = (asset) => asset?.image || PLACEHOLDER_BY_TYPE[asset?.type] || PLACEHOLDER_BY_TYPE.OTHER;

const riskFromNav = (nav) => {
    const n = Number(nav || 0);
    if (n <= 1_000_000) return { label: 'Low', score: 2 };
    if (n <= 10_000_000) return { label: 'Medium', score: 3 };
    return { label: 'High', score: 4 };
};

const Discover = () => {
    const navigate = useNavigate();
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('ALL');
    const [featuredIndex, setFeaturedIndex] = useState(0);

    const fetchPools = async () => {
        try {
            const res = await api.get('/marketplace/pools');
            setPools(res.data || []);
        } catch (e) {
            console.error('Failed to fetch discover pools:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPools();
    }, []);

    useEffect(() => {
        if (!pools.length) return undefined;
        const timer = setInterval(() => {
            setFeaturedIndex((prev) => (prev + 1) % pools.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [pools]);

    const filteredPools = useMemo(() => {
        return (pools || []).filter((pool) => {
            const name = pool.asset?.name || '';
            const symbol = pool.asset?.symbol || '';
            const type = pool.asset?.type || '';

            const s = search.trim().toLowerCase();
            const searchOk = !s || name.toLowerCase().includes(s) || symbol.toLowerCase().includes(s);
            const catOk = category === 'ALL' || type === category;
            return searchOk && catOk;
        });
    }, [pools, search, category]);

    const featuredPool = pools.length ? pools[featuredIndex % pools.length] : null;
    const featuredAsset = featuredPool?.asset || null;
    const featuredImage = resolveImage(featuredAsset);

    const openDetail = (pool) => navigate(`/asset/${pool.asset.id}`, { state: { pool } });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="ml-4 text-slate-500 font-medium">Loading discover...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <section className="relative rounded-2xl overflow-hidden bg-slate-900 min-h-[360px] md:min-h-[420px] flex items-center">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${featuredImage}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent" />
                <div className="relative z-10 p-8 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-primary/90 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        Discover
                    </div>
                    <h1 className="text-white text-3xl font-extrabold leading-tight m-0">Market Discover</h1>
                    <p className="text-slate-300 text-sm mt-3 mb-0">Institutional-grade tokenized assets with live liquidity and compliance posture.</p>
                    {featuredAsset && (
                        <div className="mt-5">
                            <p className="text-white text-xl font-black m-0">{featuredAsset.name}</p>
                            <p className="text-slate-300 text-sm m-0 mt-1">{featuredAsset.symbol} • {featuredAsset.type || 'RWA'}</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-4">
                <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {['ALL', 'METAL', 'OTHER', 'ART'].map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCategory(c)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${category === c ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                    {c === 'ALL' ? 'All Assets' : c}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm w-56"
                                    placeholder="Search assets..."
                                    type="text"
                                />
                            </div>
                            <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
                                <button type="button" onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-500'}`}>Grid View</button>
                                <button type="button" onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'table' ? 'bg-primary text-white' : 'text-slate-500'}`}>Table View</button>
                            </div>
                        </div>
                    </div>

                    {viewMode === 'table' ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                                            <th className="px-6 py-4">Asset Name</th>
                                            <th className="px-6 py-4">Market Cap</th>
                                            <th className="px-6 py-4">Liquidity</th>
                                            <th className="px-6 py-4">Proj. Yield</th>
                                            <th className="px-6 py-4">Risk</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPools.map((pool) => {
                                            const nav = Number(pool.asset?.nav || pool.asset?.valuation || 0);
                                            const apy = nav > 0 ? Math.min(15, Math.max(4, (Number(pool.totalLiquidity || 0) / nav) * 100 + 5)) : 5;
                                            const liquidityScore = nav > 0 ? Math.min(100, Math.round((Number(pool.totalLiquidity || 0) / nav) * 100)) : 0;
                                            const risk = riskFromNav(nav);
                                            return (
                                                <tr key={pool.id} className="hover:bg-primary/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-sm">{pool.asset?.name}</div>
                                                        <div className="text-[11px] text-slate-400">{pool.asset?.symbol}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold">${Number(nav).toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className="bg-primary h-full" style={{ width: `${liquidityScore}%` }} />
                                                            </div>
                                                            <span className="text-xs font-bold text-primary">{liquidityScore}/100</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-primary">{apy.toFixed(2)}%</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">{risk.label}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetail(pool)}
                                                            className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg border-none cursor-pointer"
                                                        >
                                                            Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredPools.map((pool) => (
                                <AssetCard
                                    key={pool.id}
                                    asset={{ ...pool.asset, image: resolveImage(pool.asset), totalLiquidity: pool.totalLiquidity }}
                                    onInvest={() => openDetail(pool)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Discover;
