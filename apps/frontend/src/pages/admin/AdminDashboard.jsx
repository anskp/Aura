import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCheck, UserX, AlertCircle, CheckCircle, Clock, Package, Award } from 'lucide-react';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, assetsRes] = await Promise.all([
                api.get('/users/admin/users'),
                api.get('/assets/admin/all')
            ]);
            setUsers(usersRes.data);
            setAssets(assetsRes.data);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAsset = async (assetId) => {
        try {
            await api.post(`/assets/admin/approve/${assetId}`);
            const assetsRes = await api.get('/assets/admin/all');
            setAssets(assetsRes.data);
        } catch (err) {
            console.error('Failed to approve asset:', err);
            alert('Failed to approve asset: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-4 text-slate-500 font-medium">Loading Admin Panel...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-none mb-1">Admin Governance</h3>
                    <p className="text-slate-500 text-sm">Review asset requests and compliance status</p>
                </div>
                {error && (
                    <div className="text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2 text-sm font-medium">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
            </div>

            {/* Asset Onboarding Requests */}
            <section className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><Package size={20} /></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0 bg-none">Asset Onboarding Requests</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 pl-6">Asset</th>
                                <th className="p-4">Details</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Valuations</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">No asset requests found</td>
                                </tr>
                            ) : (
                                assets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{asset.name}</div>
                                            <div className="text-xs text-slate-500 mt-1 font-medium">{asset.symbol} • {asset.type}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="max-w-[200px] text-sm text-slate-700 dark:text-slate-300 truncate">
                                                {asset.description || "N/A"}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">{asset.location || "Global"}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{asset.owner?.email || 'Unknown'}</td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-500 mb-1">User: <span className="font-bold text-slate-900 dark:text-white">${asset.valuation.toLocaleString()}</span></div>
                                            <div className="text-xs text-blue-500">AI: <span className="font-bold">${asset.aiPricing ? asset.aiPricing.toLocaleString() : 'N/A'}</span></div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-none border ${['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status)
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                }`}>
                                                {['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status) ? <CheckCircle size={10} strokeWidth={3} /> : <Clock size={10} strokeWidth={3} />}
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAsset(asset);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                                >
                                                    View
                                                </button>
                                                {asset.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleApproveAsset(asset.id)}
                                                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition shadow-none border-none"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* User List */}
            <section className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><UserCheck size={20} /></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0 bg-none">Identity & Compliance</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 pl-6">User Email</th>
                                <th className="p-4">KYC Status</th>
                                <th className="p-4">Wallets</th>
                                <th className="p-4 pr-6">Role</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 pl-6 font-medium text-sm text-slate-900 dark:text-white">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${user.kycStatus === 'APPROVED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                            {user.kycStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                                        {user.wallets?.length || 0} Connected
                                    </td>
                                    <td className="p-4 pr-6">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs font-bold uppercase tracking-wide">
                                            {user.role}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Asset Detail Modal */}
            {isDetailModalOpen && selectedAsset && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0 bg-none">{selectedAsset.name}</h2>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <AlertCircle className="rotate-45" size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-8">
                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">{selectedAsset.symbol}</span>
                                <span>•</span>
                                <span>{selectedAsset.type}</span>
                                <span>•</span>
                                <span className={selectedAsset.status === 'ONBOARDED' ? 'text-primary' : 'text-amber-500'}>{selectedAsset.status}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">User Valuation</h4>
                                    <div className="text-xl font-bold text-slate-900 dark:text-white">${selectedAsset.valuation.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                    <h4 className="text-xs font-bold text-blue-400 uppercase mb-1">AI Recommended</h4>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        ${selectedAsset.aiPricing ? selectedAsset.aiPricing.toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Asset Description</h4>
                                <p className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
                                    {selectedAsset.description || "No description provided."}
                                </p>
                            </div>

                            <div className="mb-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Location</h4>
                                <div className="text-sm text-slate-500">{selectedAsset.location || "Global / Digital"}</div>
                            </div>

                            {selectedAsset.aiReasoning && (
                                <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <h4 className="text-blue-600 dark:text-blue-400 font-bold mb-2 flex items-center gap-2 text-sm">
                                        <Award size={16} /> AI Valuation Insights
                                    </h4>
                                    <p className="text-sm text-slate-700 dark:text-blue-200/80 leading-relaxed m-0">
                                        {selectedAsset.aiReasoning}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <div className="text-xs text-slate-500 font-medium">
                                Requested by: <span className="text-slate-900 dark:text-white font-bold">{selectedAsset.owner?.email}</span>
                            </div>
                            {selectedAsset.status === 'PENDING' && (
                                <button
                                    onClick={() => {
                                        handleApproveAsset(selectedAsset.id);
                                        setIsDetailModalOpen(false);
                                    }}
                                    className="btn-primary px-6 py-2 border shadow-none"
                                >
                                    Approve Valuation
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
