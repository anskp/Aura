import { BrainCircuit } from 'lucide-react';

// Premium Local Assets
import rwaInterior from '../../assets/rwa_interior.png';
import rwaLobby from '../../assets/rwa_lobby.png';
import rwaAmenities from '../../assets/rwa_amenities.png';
import metalPlaceholder from '../../assets/metal_placeholder.png';

const PLACEHOLDER_MAP = {
    METAL: metalPlaceholder,
    REAL_ESTATE: rwaInterior,
    ART: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=80',
    CARBON: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
};

const AssetCard = ({ asset, onInvest, isPreview = false, customAction = null }) => {
    // Generate some mock/fallback data for aesthetic purposes
    const aiConfidence = 90 + (asset.id ? asset.id % 9 : 5);
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    // Premium Image Resolution with Cover Image support
    const mockImage = (asset.coverImage ? `${API_URL}${asset.coverImage}` : null) ||
        asset.image ||
        (asset.type === 'REAL_ESTATE' ? (asset.id % 2 === 0 ? rwaInterior : rwaLobby) : null) ||
        PLACEHOLDER_MAP[asset.type] ||
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80';
    const issuerName = asset.companyName || 'Aura Protocol';
    const issuerLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(issuerName)}&background=218d34&color=fff`;

    // Derived values
    const roi = asset.roi || `${(10 + (asset.id ? asset.id % 5 : 2))}%`;
    const cagr = asset.cagr || `${(12 + (asset.id ? asset.id % 6 : 4))}%`;
    const strategy = asset.investmentStrategy || 'Capital Growth';

    // Status formatting
    let statusText = 'Available';
    let statusColor = 'text-gray-500';
    if (asset.status === 'LISTED' || asset.status === 'OPEN') {
        statusText = 'Live Now';
        statusColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    } else if (asset.status === 'PENDING' || asset.status === 'TOKENIZED') {
        statusText = 'Coming Soon';
        statusColor = 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse';
    }

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 h-[420px] border border-slate-200 dark:border-slate-800">
            {/* Sliding Container */}
            <div className="absolute inset-0 flex w-[200%] transition-transform duration-500 ease-in-out -translate-x-0 group-hover:-translate-x-1/2">

                {/* 1. Initial State (Full Image View) */}
                <div className="w-1/2 h-full relative">
                    <img
                        src={mockImage}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20"></div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        <div className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest text-slate-900 shadow-lg">
                            {asset.type || 'RWA ASSET'}
                        </div>
                    </div>

                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                        <div className="bg-slate-900 px-2 py-0.5 rounded-md text-white shadow-lg border border-slate-700/50 flex items-center gap-1">
                            <span className="text-[10px] font-bold text-white">{roi}</span>
                            <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">PROJECTED ROI</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-900 shadow-lg border border-white/20">
                            {cagr} CAGR
                        </div>
                    </div>

                    {/* Bottom Info on Cover */}
                    <div className="absolute bottom-0 left-0 w-full p-5 text-white">
                        <div className="flex items-center gap-1.5 mb-2">
                            <img src={issuerLogo} alt={issuerName} className="w-5 h-5 rounded-full border border-white/30" />
                            <span className="text-[10px] font-medium text-slate-200">{issuerName}</span>
                        </div>
                        <h3 className="text-xl font-bold leading-tight mb-1 font-display">{asset.name}</h3>
                        <p className="text-xs text-slate-300 font-medium mb-4">{asset.symbol || 'AURA-TKN'}</p>

                        {customAction ? (
                            <div className="mt-auto pt-2 space-y-1.5">
                                {customAction}
                                {onInvest && (
                                    <button
                                        onClick={onInvest}
                                        className="inline-flex items-center gap-1 text-[9px] font-bold text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer tracking-wide uppercase"
                                    >
                                        View Details
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={onInvest}
                                disabled={isPreview}
                                className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide transition-colors ${isPreview ? 'text-slate-500 cursor-not-allowed' : 'text-primary hover:text-white cursor-pointer bg-transparent border-none'}`}
                            >
                                <span>{isPreview ? 'PREVIEW MODE' : 'INVEST NOW'}</span>
                                {!isPreview && (
                                    <svg className="w-3 h-3 animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Hover State (Split View) */}
                <div className="w-1/2 h-full flex">
                    {/* Left side of the split (Retained Image Strip) */}
                    <div className="w-[35%] h-full relative overflow-hidden">
                        <img
                            src={mockImage}
                            alt={asset.name}
                            className="w-full h-full object-cover scale-150"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
                    </div>

                    {/* Right side of the split (Details Panel) */}
                    <div className="w-[65%] h-full bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
                        <div className="overflow-hidden">
                            <h4 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{asset.name}</h4>
                            <div className="flex flex-wrap gap-1 mb-4">
                                <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700">{strategy}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusColor}`}>{statusText}</span>
                            </div>

                            {/* Details List */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-1.5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Asset Valuation</span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white">${Number(asset.valuation || asset.nav || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-1.5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">AI Confidence</span>
                                    <div className="flex items-center gap-1.5">
                                        <BrainCircuit size={12} className="text-primary" />
                                        <span className="text-[12px] font-bold text-primary text-right">{aiConfidence}%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-1.5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Asset Type</span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white">{asset.type}</span>
                                </div>

                                {asset.location && (
                                    <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-1.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Location</span>
                                        <span className="text-[12px] font-bold text-slate-900 dark:text-white truncate max-w-[100px] text-right">{asset.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {customAction ? (
                            <div className="mt-2 w-full space-y-2">
                                {customAction}
                                {onInvest && (
                                    <button
                                        onClick={onInvest}
                                        className="inline-flex items-center gap-1.5 w-full justify-center text-[9px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer tracking-widest uppercase py-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        View Full Details
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={onInvest}
                                disabled={isPreview}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all duration-300 w-full justify-center border-none ${isPreview ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-emerald-600 text-white shadow-lg shadow-primary/20 cursor-pointer'}`}
                            >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center -ml-1">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <span>{isPreview ? 'PREVIEW MODE' : 'VIEW DETAILS & INVEST'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetCard;
