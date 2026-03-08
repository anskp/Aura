import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Wallet, Shield, CheckCircle, Activity, Plus } from 'lucide-react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import KYCModal from '../../components/KYCModal';
import AssetCard from '../../components/marketplace/AssetCard';

const UserDashboard = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [wallets, setWallets] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('investor');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [walletRes, assetRes] = await Promise.all([
                api.get('/wallets'),
                api.get('/assets/my-assets')
            ]);
            setWallets(walletRes.data);
            setAssets(assetRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        let ethereum = window.ethereum;

        if (ethereum?.providers) {
            ethereum = ethereum.providers.find(p => p.isMetaMask) || ethereum.providers[0];
        }

        if (!ethereum) {
            alert('No Web3 wallet detected. Please install MetaMask.');
            return;
        }

        setConnecting(true);
        try {
            const provider = new ethers.BrowserProvider(ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const network = await provider.getNetwork();

            let chain = 'UNKNOWN';
            const chainId = Number(network.chainId);

            if (chainId === 11155111) chain = 'ETH_SEP';
            if (chainId === 80002) chain = 'AMOY';
            if (chainId === 43113) chain = 'FUJI';

            await api.post('/wallets', { address: accounts[0], chain });
            await refreshUser();
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Wallet connection failed');
        } finally {
            setConnecting(false);
        }
    };

    const isKYCComplete = user?.kycStatus === 'APPROVED';
    const isWalletConnected = wallets.length > 0;
    const isFullyOnboarded = isKYCComplete && isWalletConnected;

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-4 text-slate-500 font-medium">Loading dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header and Tab Switcher */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 bg-none text-slate-900 dark:text-white m-0 pb-1">Overview</h1>
                    <p className="text-slate-500 dark:text-slate-400 m-0">Monitor your RWA portfolio and real-time AI valuations.</p>
                </div>

                {/* Tab Controls */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('investor')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${activeTab === 'investor'
                            ? 'bg-white dark:bg-background-dark text-primary shadow-sm'
                            : 'bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        Investor Statistics
                    </button>
                    <button
                        onClick={() => setActiveTab('issuer')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${activeTab === 'issuer'
                            ? 'bg-white dark:bg-background-dark text-primary shadow-sm'
                            : 'bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        Issuer Statistics
                    </button>
                </div>
            </div>

            {/* Render View based on activeTab */}
            {activeTab === 'investor' ? (
                // --- INVESTOR VIEW ---
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                    {!isFullyOnboarded && (
                        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white mb-2 bg-none m-0 pb-2">
                                <Activity className="text-primary w-5 h-5" /> Complete Your Onboarding
                            </h2>
                            <p className="text-slate-500 mb-6 text-sm m-0 pb-4">
                                To start trading Real-World Assets, you need to complete two simple steps:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-6 rounded-xl border ${isWalletConnected ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-background-dark border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white m-0">Step 1: Connect Wallet</h4>
                                        {isWalletConnected ? <CheckCircle className="text-emerald-500 w-5 h-5" /> : <Wallet className="text-slate-400 w-5 h-5" />}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Connect your Web3 wallet (MetaMask) to manage your RWA tokens.
                                    </p>
                                    {!isWalletConnected && (
                                        <button onClick={connectWallet} disabled={connecting} className="btn-primary w-full shadow-none border border-primary">
                                            {connecting ? 'Connecting...' : 'Connect Wallet'}
                                        </button>
                                    )}
                                </div>

                                <div className={`p-6 rounded-xl border ${isKYCComplete ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-background-dark border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white m-0">Step 2: Complete KYC</h4>
                                        {isKYCComplete ? <CheckCircle className="text-emerald-500 w-5 h-5" /> : <Shield className="text-slate-400 w-5 h-5" />}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Verify your identity via Sumsub to enable on-chain trading.
                                    </p>
                                    {!isKYCComplete && (
                                        <div className="flex flex-col gap-3">
                                            <button onClick={() => setIsKYCModalOpen(true)} className="btn-primary w-full shadow-none border border-primary">
                                                {user?.kycStatus === 'PENDING' ? 'Resume KYC' : 'Verify Identity'}
                                            </button>
                                            {user?.kycStatus === 'PENDING' && (
                                                <button
                                                    onClick={async () => {
                                                        setLoading(true);
                                                        try {
                                                            await api.post('/kyc/verify-completion');
                                                            await refreshUser();
                                                            fetchData();
                                                        } catch (err) {
                                                            console.error('Manual sync failed', err);
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                    className="text-xs text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
                                                >
                                                    Already finished? Check Status
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-background-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-slate-500 text-sm font-medium">Total Invested Value</span>
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">+0.0%</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white bg-none m-0 pb-1">$0.00</span>
                                <span className="text-slate-400 text-xs mt-1">~0 ETH</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-background-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-slate-500 text-sm font-medium">Current Yield (APY)</span>
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-bold">Stable</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white bg-none m-0 pb-1">0.0%</span>
                                <span className="text-slate-400 text-xs mt-1">Across 0 active pools</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-background-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer" onClick={() => navigate('/portfolio')}>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-slate-500 text-sm font-medium">Total Tokens</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white bg-none m-0 pb-1">0</span>
                                <span className="text-slate-400 text-xs mt-1 text-primary hover:underline">View in Portfolio & Wallet</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Holdings (Hardcoded for Demo) */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold bg-none m-0 text-slate-900 dark:text-white">Active Holdings</h3>
                            <button className="text-sm text-primary font-bold hover:underline bg-transparent border-none cursor-pointer" onClick={() => navigate('/portfolio')}>View All</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {/* Rendering mock assets in the dashboard */}
                            {[{
                                id: 1,
                                name: "Skyline Residency Tower A",
                                type: "REAL ESTATE",
                                symbol: "SKY-A",
                                nav: 8450000,
                                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
                                roi: "12%",
                                cagr: "15%",
                                companyName: "Emaar Properties",
                                investmentStrategy: "High-Yield",
                                location: "Dubai, UAE",
                                status: "LISTED"
                            }, {
                                id: 2,
                                name: "Solar Farm Revenue Share",
                                type: "CARBON CREDITS",
                                symbol: "SOLAR-RS",
                                nav: 2500000,
                                image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
                                roi: "14%",
                                cagr: "16%",
                                companyName: "Renewable Energy Corp",
                                investmentStrategy: "Yield via Offtake",
                                location: "California, USA",
                                status: "LISTED"
                            }].map(asset => (
                                <AssetCard key={asset.id} asset={asset} isPreview={true} />
                            ))}
                        </div>
                    </section>

                    {/* Wallets & Activity Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="bg-white dark:bg-background-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white bg-none m-0">Connected Wallets</h3>
                                <button onClick={connectWallet} disabled={connecting} className="text-sm text-primary font-bold hover:underline flex items-center gap-1 bg-transparent border-none p-0 w-auto cursor-pointer">
                                    <Plus size={16} /> {connecting ? 'Connecting...' : 'Add'}
                                </button>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Address</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Network</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
                                        {wallets.map(w => (
                                            <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium font-mono text-slate-600 dark:text-slate-400">
                                                    {w.address.substring(0, 6)}...{w.address.substring(w.address.length - 4)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                                                        {w.chain}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {wallets.length === 0 && (
                                            <tr>
                                                <td colSpan="2" className="px-6 py-12 text-center text-sm text-slate-400">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Wallet className="w-8 h-8 opacity-20 mb-3" />
                                                        No wallets connected
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-background-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white bg-none m-0">Recent Activity</h3>
                                <a className="text-sm text-primary font-bold hover:underline cursor-pointer">View All</a>
                            </div>
                            <div className="p-8 text-center flex flex-col items-center justify-center flex-1 min-h-[200px]">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full mb-4 flex items-center justify-center text-slate-300 border border-slate-100 dark:border-slate-700 shadow-inner">
                                    <Activity size={24} />
                                </div>
                                <p className="text-sm text-slate-500 font-medium m-0">No recent transactions</p>
                            </div>
                        </section>
                    </div>
                </div>
            ) : (
                // --- ISSUER VIEW (Reference Portal) ---
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">

                    {/* Exporter Row */}
                    <div className="flex justify-end mb-2">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer border-solid">
                            <span className="material-symbols-outlined text-[20px]">file_download</span>
                            Export CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 m-0">Total Value Locked</p>
                                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">account_balance</span>
                            </div>
                            <div className="flex items-end gap-3">
                                <p className="text-3xl font-black tracking-tight m-0">$14.28M</p>
                                <p className="text-emerald-600 text-sm font-bold flex items-center mb-1 m-0">
                                    <span className="material-symbols-outlined text-[18px]">trending_up</span>
                                    5.2%
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 m-0">Active Assets</p>
                                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">layers</span>
                            </div>
                            <div className="flex items-end gap-3">
                                <p className="text-3xl font-black tracking-tight m-0">{assets.length > 0 ? assets.length : '24'}</p>
                                <p className="text-primary text-sm font-bold mb-1 m-0">+2 this month</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 m-0">Avg. Pool APY</p>
                                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">percent</span>
                            </div>
                            <div className="flex items-end gap-3">
                                <p className="text-3xl font-black tracking-tight m-0">8.42%</p>
                                <p className="text-slate-400 text-sm font-medium mb-1 m-0">Global Market Avg: 7.1%</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Grid: Assets Table & AI Insights */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Left: My Assets Table */}
                        <div className="xl:col-span-2 bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-lg m-0 text-slate-900 dark:text-slate-100">My Tokenized Assets</h3>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-500">filter_list</span>
                                    </button>
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center" onClick={() => navigate('/assets/onboard')}>
                                        <span className="material-symbols-outlined text-primary">add_circle</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Asset Name</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Valuation (NAV)</th>
                                            <th className="px-6 py-4 text-center">Reserve</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                        <span className="material-symbols-outlined">grid_goldenratio</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm m-0 pb-1 text-slate-900 dark:text-slate-100">Bullion Reserve AU-92</p>
                                                        <p className="text-xs text-slate-400 m-0">ID: 0x48a...e912</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gold</span></td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">In Pool</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">$2,145,200</td>
                                            <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-500">verified</span></td>
                                        </tr>
                                        <tr className="bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10 transition-colors cursor-pointer">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                        <span className="material-symbols-outlined">apartment</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm m-0 pb-1 text-slate-900 dark:text-slate-100">Skyline Residency Tower A</p>
                                                        <p className="text-xs text-slate-400 m-0">ID: 0x92f...a421</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Real Estate</span></td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-tight">Tokenized</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">$8,450,000</td>
                                            <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-500">verified</span></td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                                        <span className="material-symbols-outlined">villa</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm m-0 pb-1 text-slate-900 dark:text-slate-100">Malibu Beachfront Estate</p>
                                                        <p className="text-xs text-slate-400 m-0">ID: 0xc4b...3820</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Real Estate</span></td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Pending AI</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-400">Processing...</td>
                                            <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300">hourglass_empty</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center bg-slate-50/50 dark:bg-slate-900/50 mt-auto">
                                <button className="text-primary text-sm font-bold hover:underline bg-transparent border-none cursor-pointer" onClick={() => navigate('/assets')}>View All Assets</button>
                            </div>
                        </div>

                        {/* Right: AI Valuation Insight Card & Mini Map */}
                        <div className="flex flex-col gap-6">
                            {/* AI Valuation Insight */}
                            <div className="bg-white dark:bg-background-dark rounded-xl border-2 border-primary/20 shadow-xl overflow-hidden shadow-primary/5">
                                <div className="bg-primary/5 p-5 border-b border-primary/10 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <span className="material-symbols-outlined text-primary">psychology</span>
                                        <h3 className="font-bold text-lg m-0">AI Valuation</h3>
                                    </div>
                                    <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Gemini Pro 1.5</span>
                                </div>
                                <div className="p-6">
                                    <div className="mb-6">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest m-0 pb-1">Selected Asset</p>
                                        <h4 className="text-xl font-bold m-0 pb-1 text-slate-900 dark:text-slate-100">Skyline Residency Tower A</h4>
                                        <p className="text-sm text-slate-500 m-0">Last update: 14 mins ago</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 m-0">NAV Trend (30D)</p>
                                                <p className="text-sm font-bold text-emerald-600 m-0">+1.4%</p>
                                            </div>
                                            <div className="h-16 w-full flex items-end gap-1">
                                                <div className="flex-1 bg-emerald-500/20 rounded-t-sm h-8"></div>
                                                <div className="flex-1 bg-emerald-500/20 rounded-t-sm h-10"></div>
                                                <div className="flex-1 bg-emerald-500/20 rounded-t-sm h-12"></div>
                                                <div className="flex-1 bg-emerald-500/30 rounded-t-sm h-11"></div>
                                                <div className="flex-1 bg-emerald-500/30 rounded-t-sm h-14"></div>
                                                <div className="flex-1 bg-emerald-500/40 rounded-t-sm h-16"></div>
                                                <div className="flex-1 bg-emerald-500 h-14"></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 m-0">Market Sentiment</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-emerald-500 text-sm">trending_up</span>
                                                    <p className="text-sm font-bold m-0 mt-1 text-slate-900 dark:text-slate-100">Bullish</p>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 m-0">Risk Score</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-blue-500 text-sm">security</span>
                                                    <p className="text-sm font-bold m-0 mt-1 text-slate-900 dark:text-slate-100">Low (1.2)</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic m-0">
                                                "Asset value supported by increased demand in the commercial sector. Projected 2.1% growth over next quarter based on localized urban development trends."
                                            </p>
                                        </div>

                                        <button className="w-full py-3 bg-primary/10 text-primary border-none cursor-pointer text-sm font-bold rounded-lg hover:bg-primary/20 transition-colors">
                                            View Full Valuation Report
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Proof of Reserve */}
                            <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4 text-slate-900 dark:text-slate-100">
                                    <h4 className="font-bold text-sm m-0">Proof of Reserve Status</h4>
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                </div>
                                <div className="relative w-full flex-1 min-h-[100px] rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden mb-4 border border-slate-300 dark:border-slate-700">
                                    <div className="absolute inset-0 bg-cover bg-center opacity-70 grayscale" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')" }}></div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 bg-primary rounded-full animate-ping absolute"></div>
                                        <div className="w-4 h-4 bg-primary rounded-full relative shadow-lg shadow-primary"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs items-center">
                                    <span className="text-slate-500">Oracle Network</span>
                                    <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">Chainlink PoR v2</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            <KYCModal
                isOpen={isKYCModalOpen}
                onClose={() => setIsKYCModalOpen(false)}
                onComplete={async () => {
                    await refreshUser();
                    fetchData();
                    setIsKYCModalOpen(false);
                }}
            />
        </div>
    );
};

export default UserDashboard;
