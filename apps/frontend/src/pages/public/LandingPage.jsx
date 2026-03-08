import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleLaunchApp = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased selection:bg-primary/30">
            <div className="layout-container flex h-full grow flex-col">
                {/* Navigation */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 md:px-20 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-teal-400 via-primary to-violet-600 rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl">token</span>
                        </div>
                        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight bg-none m-0">AURA</h2>
                    </div>
                    <div className="flex flex-1 justify-end gap-8 items-center">
                        <nav className="hidden md:flex items-center gap-8">
                            <a className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-semibold cursor-pointer">Investors</a>
                            <a className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-semibold cursor-pointer">Issuers</a>
                            <a className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-semibold cursor-pointer">Governance</a>
                        </nav>
                        <div className="flex items-center gap-4">
                            {user ? (
                                <button
                                    onClick={handleLaunchApp}
                                    className="hidden sm:flex min-w-[120px] cursor-pointer items-center justify-center rounded-full h-10 px-6 bg-primary text-white text-sm font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 border-none"
                                >
                                    Go to Dashboard
                                </button>
                            ) : (
                                <>
                                    <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors text-sm font-semibold">Sign In</Link>
                                    <button
                                        onClick={handleLaunchApp}
                                        className="hidden sm:flex min-w-[120px] cursor-pointer items-center justify-center rounded-full h-10 px-6 bg-primary text-white text-sm font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 border-none"
                                    >
                                        Launch App
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1">
                    {/* Hero Section */}
                    <div className="px-6 md:px-20 py-12 md:py-24 max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="flex flex-col gap-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest w-fit border border-primary/20">
                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                    Next-Gen RWA Protocol
                                </div>
                                <h1 className="text-slate-900 dark:text-white text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight m-0 bg-none">
                                    Turning the Physical World into <span className="bg-clip-text text-transparent bg-gradient-to-br from-teal-400 to-primary">Autonomous</span> On-Chain Liquidity
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl leading-relaxed max-w-xl m-0">
                                    The premier Autonomous RWA Liquidity Protocol for tokenizing real-world assets like gold and real estate with AI-powered valuation and institutional-grade security.
                                </p>
                                <div className="flex flex-wrap gap-4 mt-2">
                                    <button
                                        onClick={handleLaunchApp}
                                        className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-primary text-white text-lg font-bold transition-all hover:shadow-xl hover:shadow-primary/30 border-none"
                                    >
                                        Get Started
                                    </button>
                                    <button className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 border-2 border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white text-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        Whitepaper
                                    </button>
                                </div>
                            </div>
                            <div className="relative mt-12 lg:mt-0">
                                <div className="absolute -inset-4 bg-gradient-to-br from-teal-400 via-primary to-violet-600 opacity-20 blur-3xl rounded-full"></div>
                                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
                                    <div className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform hover:scale-105 duration-700" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618044733300-94f4bf0082c3?auto=format&fit=crop&q=80&w=1000')" }}></div>
                                    <div className="absolute bottom-6 left-6 right-6 p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                                        <div className="flex justify-between items-end text-white">
                                            <div>
                                                <p className="text-xs font-medium opacity-80 m-0 pb-1">Current Gold Value</p>
                                                <p className="text-2xl font-bold m-0">$2,341.20 / oz</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-medium opacity-80 m-0 pb-1">AI Confidence</p>
                                                <p className="text-xl font-bold text-teal-400 m-0">99.8%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="px-6 md:px-20 py-16 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
                        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-3 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-primary/30 transition-colors group">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider m-0">Total Value Locked</p>
                                <div className="flex items-end gap-3 pt-2">
                                    <p className="text-slate-900 dark:text-white text-4xl font-bold m-0">$1.24B</p>
                                    <p className="text-emerald-500 text-sm font-bold pb-1 flex items-center m-0 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                        <span className="material-symbols-outlined text-xs mr-1">trending_up</span>
                                        12.4%
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-teal-500/30 transition-colors group">
                                <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 mb-2 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">layers</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider m-0">Assets Tokenized</p>
                                <div className="flex items-end gap-3 pt-2">
                                    <p className="text-slate-900 dark:text-white text-4xl font-bold m-0">4,500+</p>
                                    <p className="text-emerald-500 text-sm font-bold pb-1 flex items-center m-0 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                        <span className="material-symbols-outlined text-xs mr-1">trending_up</span>
                                        8.2%
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-violet-500/30 transition-colors group">
                                <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 mb-2 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">groups</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider m-0">Active Investors</p>
                                <div className="flex items-end gap-3 pt-2">
                                    <p className="text-slate-900 dark:text-white text-4xl font-bold m-0">12.8K</p>
                                    <p className="text-emerald-500 text-sm font-bold pb-1 flex items-center m-0 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                        <span className="material-symbols-outlined text-xs mr-1">trending_up</span>
                                        5.1%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Process Section */}
                    <div className="px-6 md:px-20 py-24 max-w-7xl mx-auto overflow-hidden">
                        <div className="text-center mb-16">
                            <h2 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-bold mb-4 tracking-tight bg-none m-0 pb-4">The Asset to Liquidity Process</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto m-0">Our autonomous pipeline ensures seamless transition from physical verification to decentralized liquidity.</p>
                        </div>
                        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Connecting Line (Desktop) */}
                            <div className="hidden md:block absolute top-12 left-10 right-10 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10"></div>

                            <div className="flex flex-col items-center text-center gap-4 group">
                                <div className="h-24 w-24 rounded-full bg-white dark:bg-slate-900 border-4 border-background-light dark:border-background-dark shadow-xl flex items-center justify-center text-primary group-hover:bg-gradient-to-br group-hover:from-teal-400 group-hover:to-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-4xl">upload_file</span>
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2 m-0 bg-none">Asset Submission</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">Securely upload legal titles and provenance proof for physical assets.</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center gap-4 group">
                                <div className="h-24 w-24 rounded-full bg-white dark:bg-slate-900 border-4 border-background-light dark:border-background-dark shadow-xl flex items-center justify-center text-teal-500 group-hover:bg-gradient-to-br group-hover:from-teal-400 group-hover:to-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-4xl">smart_toy</span>
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2 m-0 bg-none">AI Valuation</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">Our autonomous engine calculates fair market value using real-time global data.</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center gap-4 group">
                                <div className="h-24 w-24 rounded-full bg-white dark:bg-slate-900 border-4 border-background-light dark:border-background-dark shadow-xl flex items-center justify-center text-primary group-hover:bg-gradient-to-br group-hover:from-teal-400 group-hover:to-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-4xl">generating_tokens</span>
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2 m-0 bg-none">Tokenization</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">Compliant RWA tokens are minted on-chain, representing fractional ownership.</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center gap-4 group">
                                <div className="h-24 w-24 rounded-full bg-white dark:bg-slate-900 border-4 border-background-light dark:border-background-dark shadow-xl flex items-center justify-center text-violet-500 group-hover:bg-gradient-to-br group-hover:from-teal-400 group-hover:to-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-4xl">waves</span>
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2 m-0 bg-none">Liquidity Pool</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">Instant market making through automated deep liquidity pools.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white dark:bg-background-dark px-6 md:px-20 py-12 border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
                        <div className="flex flex-col gap-4 max-w-xs">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-teal-400 via-primary to-violet-600 rounded flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-base">token</span>
                                </div>
                                <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight m-0 bg-none">AURA</h2>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm m-0">Building the future of decentralized finance by bridging the physical and digital worlds.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                            <div className="flex flex-col gap-3">
                                <h4 className="text-slate-900 dark:text-white font-bold m-0 bg-none mb-1">Platform</h4>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Invest</a>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Tokenize</a>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Staking</a>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h4 className="text-slate-900 dark:text-white font-bold m-0 bg-none mb-1">Protocol</h4>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Governance</a>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Documentation</a>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Audit Reports</a>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h4 className="text-slate-900 dark:text-white font-bold m-0 bg-none mb-1">Legal</h4>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Privacy</a>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Terms</a>
                                <a className="text-slate-500 hover:text-primary text-sm cursor-pointer transition-colors">Compliance</a>
                            </div>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-sm m-0">© 2026 AURA Protocol. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
