import React from 'react';

const PortfolioWallet = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-wrap justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-4xl font-bold leading-tight bg-none m-0">Portfolio & Wallet</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your Real World Assets and wallet balances.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button className="flex cursor-pointer items-center justify-center gap-2 rounded-full h-12 px-6 bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors border-none">
                        <span className="material-symbols-outlined">swap_horiz</span>
                        <span>Swap</span>
                    </button>
                    <button className="flex cursor-pointer items-center justify-center gap-2 rounded-full h-12 px-6 bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 border-none">
                        <span className="material-symbols-outlined">add</span>
                        <span>Deposit Funds</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Portfolio Visual Breakdown */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Total Value Card */}
                    <div className="bg-white dark:bg-[#1a2b1d] rounded-xl p-8 shadow-sm border border-primary/10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1 m-0">Total Portfolio Value</p>
                                <p className="text-slate-900 dark:text-slate-100 tracking-tight text-5xl font-bold leading-tight m-0 bg-none">$124,500.00</p>
                            </div>
                            <div className="bg-primary/10 rounded-lg px-3 py-1.5 flex items-center gap-1 text-primary font-bold">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>+12.5%</span>
                            </div>
                        </div>

                        {/* Simplified Chart Area */}
                        <div className="relative h-64 w-full flex items-center justify-center bg-background-light dark:bg-background-dark rounded-lg mb-6 border border-primary/5">
                            <svg className="w-48 h-48 circular-chart" viewBox="0 0 36 36">
                                <path className="text-primary/20 stroke-current" d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray="100, 100" strokeWidth="3"></path>
                                <path className="text-primary stroke-current" d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray="45, 100" strokeLinecap="round" strokeWidth="4"></path>
                                <path className="text-[#078827] stroke-current" d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray="35, 100" strokeDashoffset="-45" strokeLinecap="round" strokeWidth="4"></path>
                                <path className="text-[#67836c] stroke-current" d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray="20, 100" strokeDashoffset="-80" strokeLinecap="round" strokeWidth="4"></path>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-slate-500 text-sm font-semibold">RWA Holdings</span>
                                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">3 Classes</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-primary/5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase m-0">Real Estate</p>
                                </div>
                                <p className="text-slate-900 dark:text-slate-100 font-bold text-lg m-0">45%</p>
                                <p className="text-slate-500 text-sm m-0">$56,025.00</p>
                            </div>
                            <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-primary/5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full bg-[#078827]"></div>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase m-0">Private Equity</p>
                                </div>
                                <p className="text-slate-900 dark:text-slate-100 font-bold text-lg m-0">35%</p>
                                <p className="text-slate-500 text-sm m-0">$43,575.00</p>
                            </div>
                            <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-primary/5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full bg-[#67836c]"></div>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase m-0">Treasuries</p>
                                </div>
                                <p className="text-slate-900 dark:text-slate-100 font-bold text-lg m-0">20%</p>
                                <p className="text-slate-500 text-sm m-0">$24,900.00</p>
                            </div>
                        </div>
                    </div>

                    {/* RWA Tokens List */}
                    <div className="bg-white dark:bg-[#1a2b1d] rounded-xl p-6 shadow-sm border border-primary/10">
                        <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4 bg-none m-0 pb-4">Minted RWA Tokens</h2>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors border border-transparent hover:border-primary/10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">apartment</span>
                                    </div>
                                    <div>
                                        <p className="text-slate-900 dark:text-slate-100 font-bold m-0">AURA-RE1</p>
                                        <p className="text-slate-500 text-sm m-0">Miami Commercial Hub</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold m-0">5,602.50 Tokens</p>
                                    <p className="text-slate-500 text-sm m-0">$56,025.00</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors border border-transparent hover:border-primary/10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-[#078827]/10 flex items-center justify-center text-[#078827]">
                                        <span className="material-symbols-outlined">work</span>
                                    </div>
                                    <div>
                                        <p className="text-slate-900 dark:text-slate-100 font-bold m-0">AURA-PE2</p>
                                        <p className="text-slate-500 text-sm m-0">Tech Growth Fund</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold m-0">4,357.50 Tokens</p>
                                    <p className="text-slate-500 text-sm m-0">$43,575.00</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Wallet & Transactions */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Wallet Balances */}
                    <div className="bg-white dark:bg-[#1a2b1d] rounded-xl p-6 shadow-sm border border-primary/10">
                        <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4 bg-none m-0 pb-4">Wallet Balances</h2>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-primary/10 bg-background-light dark:bg-background-dark">
                                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <span className="material-symbols-outlined">attach_money</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold m-0">USDC</p>
                                    <p className="text-slate-500 text-sm m-0">USD Coin</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold m-0">$45,000.00</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-lg border border-primary/10 bg-background-light dark:bg-background-dark">
                                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <span className="material-symbols-outlined">currency_exchange</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold m-0">USDT</p>
                                    <p className="text-slate-500 text-sm m-0">Tether</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold m-0">$12,300.50</p>
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-3 rounded-lg border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 bg-transparent">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                            Connect another wallet
                        </button>
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white dark:bg-[#1a2b1d] rounded-xl p-6 shadow-sm border border-primary/10 flex-1">
                        <div className="flex justify-between items-center mb-4 pb-2">
                            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold bg-none m-0">Recent Transactions</h2>
                            <a className="text-primary text-sm font-semibold hover:underline cursor-pointer">View All</a>
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Buy Transaction */}
                            <div className="flex items-center justify-between pb-4 border-b border-primary/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Buy</span>
                                            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm m-0">AURA-RE1</p>
                                        </div>
                                        <p className="text-slate-500 text-xs mt-0.5 m-0 pt-1">Today, 14:32</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold text-sm m-0">+500.00</p>
                                    <p className="text-primary text-xs font-semibold flex items-center justify-end gap-1 mt-0.5 m-0 pt-1">
                                        <span className="material-symbols-outlined text-[12px]">check_circle</span> Completed
                                    </p>
                                </div>
                            </div>

                            {/* Sell Transaction */}
                            <div className="flex items-center justify-between pb-4 border-b border-primary/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Sell</span>
                                            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm m-0">AURA-PE2</p>
                                        </div>
                                        <p className="text-slate-500 text-xs mt-0.5 m-0 pt-1">Yesterday, 09:15</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold text-sm m-0">-150.00</p>
                                    <p className="text-primary text-xs font-semibold flex items-center justify-end gap-1 mt-0.5 m-0 pt-1">
                                        <span className="material-symbols-outlined text-[12px]">check_circle</span> Completed
                                    </p>
                                </div>
                            </div>

                            {/* Deposit Transaction */}
                            <div className="flex items-center justify-between pb-4 border-b border-primary/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <span className="material-symbols-outlined text-sm">login</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Deposit</span>
                                            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm m-0">USDC</p>
                                        </div>
                                        <p className="text-slate-500 text-xs mt-0.5 m-0 pt-1">Oct 24, 11:20</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold text-sm m-0">+$10,000.00</p>
                                    <p className="text-amber-500 text-xs font-semibold flex items-center justify-end gap-1 mt-0.5 m-0 pt-1">
                                        <span className="material-symbols-outlined text-[12px]">schedule</span> Pending
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioWallet;
