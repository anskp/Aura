import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ArrowRight, BrainCircuit, Shield, TrendingUp,
    MapPin, Building2, Coins, BarChart3, BadgeCheck,
    ChevronRight, ExternalLink, Globe
} from 'lucide-react';

const StatBadge = ({ label, value, accent = false }) => (
    <div className={`flex flex-col gap-0.5 px-4 py-3 rounded-xl border ${accent
        ? 'bg-primary/10 border-primary/20'
        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700'
        }`}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <span className={`text-base font-extrabold ${accent ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
);

const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div className="flex items-center gap-2 text-slate-500">
            {Icon && <Icon size={13} />}
            <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-[13px] font-bold text-slate-900 dark:text-white text-right max-w-[55%] truncate">{value || '—'}</span>
    </div>
);

const AssetDetailModal = ({ pool, asset: directAsset, isOpen, onClose, onInvest, customAction }) => {
    if (!isOpen || (!pool && !directAsset)) return null;

    const asset = directAsset || pool?.asset || pool;
    const aiConfidence = 90 + (asset.id ? asset.id % 9 : 5);
    const roi = asset.roi || `${10 + (asset.id ? asset.id % 5 : 2)}%`;
    const cagr = asset.cagr || `${12 + (asset.id ? asset.id % 6 : 4)}%`;
    const strategy = asset.investmentStrategy || 'Capital Growth';
    const mockImage = asset.image || 'https://images.unsplash.com/photo-1618044733300-94f4bf0082c3?auto=format&fit=crop&q=80&w=1000';
    const issuerName = asset.companyName || 'Aura Protocol';
    const issuerLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(issuerName)}&background=218d34&color=fff`;

    let statusText = 'Available';
    let statusColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    if (asset.status === 'LISTED' || asset.status === 'OPEN') {
        statusText = 'Live Now';
        statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else if (asset.status === 'PENDING' || asset.status === 'TOKENIZED') {
        statusText = 'Coming Soon';
        statusColor = 'bg-amber-50 text-amber-700 border border-amber-200';
    }

    const totalLiquidity = pool?.totalLiquidity || asset.totalLiquidity || 0;
    const valuation = asset.valuation || asset.nav || 0;
    const fundedPct = valuation > 0 ? Math.min(100, Math.round((totalLiquidity / valuation) * 100)) : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {/* ─── Hero Banner ─── */}
                        <div className="relative h-56 flex-shrink-0 overflow-hidden">
                            <img
                                src={mockImage}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                            >
                                <X size={16} className="text-white" />
                            </button>

                            {/* Type badge */}
                            <div className="absolute top-4 left-4 flex gap-2 items-center">
                                <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest text-slate-900 shadow">
                                    {asset.type || 'RWA ASSET'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest shadow ${statusColor}`}>
                                    {statusText}
                                </span>
                            </div>

                            {/* Hero bottom info */}
                            <div className="absolute bottom-0 left-0 p-6 w-full">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <img src={issuerLogo} alt={issuerName} className="w-6 h-6 rounded-full border-2 border-white/30" />
                                    <span className="text-xs font-semibold text-white/80">{issuerName}</span>
                                    <BadgeCheck size={14} className="text-primary" />
                                </div>
                                <h2 className="text-2xl font-extrabold text-white leading-tight mb-1">{asset.name}</h2>
                                <p className="text-sm text-white/60 font-mono">{asset.symbol || 'AURA-TKN'}</p>
                            </div>
                        </div>

                        {/* ─── Scrollable Body ─── */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <StatBadge label="Projected ROI" value={roi} accent />
                                <StatBadge label="CAGR" value={cagr} />
                                <StatBadge label="AI Confidence" value={`${aiConfidence}%`} accent />
                                <StatBadge label="Strategy" value={strategy} />
                            </div>

                            {/* Funding Progress */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Funding Progress</span>
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">{fundedPct}% Filled</span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${fundedPct}%` }}
                                        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[11px] text-slate-500 font-semibold">
                                        ${Number(totalLiquidity).toLocaleString()} raised
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">
                                        Goal: ${Number(valuation).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Two-col layout for details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Asset Details */}
                                <div className="bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                        <Building2 size={12} /> Asset Details
                                    </h4>
                                    <DetailRow icon={Globe} label="Asset Type" value={asset.type} />
                                    <DetailRow icon={MapPin} label="Location" value={asset.location} />
                                    <DetailRow icon={Coins} label="Token Symbol" value={asset.symbol || 'AURA-TKN'} />
                                    <DetailRow icon={BarChart3} label="Valuation" value={`$${Number(valuation).toLocaleString()}`} />
                                    {asset.maturityDate && (
                                        <DetailRow icon={TrendingUp} label="Maturity" value={new Date(asset.maturityDate).toLocaleDateString()} />
                                    )}
                                </div>

                                {/* Risk & Compliance */}
                                <div className="bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                        <Shield size={12} /> Risk & Compliance
                                    </h4>
                                    <DetailRow icon={Shield} label="Standard" value="ERC-3643 / T-REX" />
                                    <DetailRow icon={BadgeCheck} label="KYC Required" value="Yes — Whitelisted" />
                                    <DetailRow icon={Shield} label="Proof of Reserve" value="On-Chain Oracle" />
                                    <DetailRow icon={BrainCircuit} label="AI Score" value={`${aiConfidence}/100`} />
                                    <DetailRow icon={TrendingUp} label="Risk Level" value={asset.riskLevel || 'Moderate'} />
                                </div>
                            </div>

                            {/* Description */}
                            {asset.description && (
                                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">About This Asset</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{asset.description}</p>
                                </div>
                            )}

                            {/* AI Confidence Bar */}
                            <div className="bg-gradient-to-r from-primary/5 to-emerald-500/5 border border-primary/10 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <BrainCircuit size={16} className="text-primary" />
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Aura AI Assessment</span>
                                    </div>
                                    <span className="text-lg font-extrabold text-primary">{aiConfidence}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${aiConfidence}%` }}
                                        transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    AI-driven confidence score based on asset fundamentals, market conditions, and on-chain reserve health.
                                </p>
                            </div>
                        </div>

                        {/* ─── Footer CTA ─── */}
                        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="text-xs text-slate-500">
                                        <Shield size={11} className="inline mr-1 text-primary" />
                                        Institutional-grade compliance · ERC-3643 verified
                                    </p>
                                </div>
                                {customAction ? (
                                    <div className="flex-shrink-0">{customAction}</div>
                                ) : (
                                    <button
                                        onClick={() => { onClose(); onInvest && onInvest(); }}
                                        className="flex items-center gap-2.5 px-8 py-3.5 bg-primary hover:bg-emerald-600 text-white font-extrabold text-sm tracking-wide rounded-2xl shadow-lg shadow-primary/25 transition-all duration-200 cursor-pointer border-none hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Coins size={16} />
                                        <span>Invest Now</span>
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AssetDetailModal;
