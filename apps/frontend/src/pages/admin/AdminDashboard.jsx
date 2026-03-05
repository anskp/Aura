import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCheck, UserX, AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';

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
            // Refresh assets
            const assetsRes = await api.get('/assets/admin/all');
            setAssets(assetsRes.data);
        } catch (err) {
            console.error('Failed to approve asset:', err);
            alert('Failed to approve asset: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return <div className="container"><h2>Loading Admin Panel...</h2></div>;

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-6">
                <h1 style={{ margin: 0 }}>Admin Governance</h1>
                {error && <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} /> {error}
                </div>}
            </div>

            {/* Asset Onboarding Requests */}
            <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="text-accent" size={24} />
                    <h2 style={{ margin: 0 }}>Asset Onboarding Requests</h2>
                </div>
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)' }}>
                                <th style={{ padding: '1rem' }}>Asset</th>
                                <th style={{ padding: '1rem' }}>Details</th>
                                <th style={{ padding: '1rem' }}>Owner</th>
                                <th style={{ padding: '1rem' }}>Valuations</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No asset requests found</td></tr>
                            ) : (
                                assets.map(asset => (
                                    <tr key={asset.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold' }}>{asset.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.symbol} • {asset.type}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ maxWidth: '200px', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {asset.description || "N/A"}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.location || "Global"}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{asset.owner?.email || 'Unknown'}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.875rem' }}>User: <span style={{ fontWeight: 'bold' }}>${asset.valuation.toLocaleString()}</span></div>
                                            <div style={{ fontSize: '0.875rem', color: '#60a5fa' }}>AI: <span style={{ fontWeight: 'bold' }}>${asset.aiPricing ? asset.aiPricing.toLocaleString() : 'N/A'}</span></div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                width: 'fit-content',
                                                background: ['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: ['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status) ? '#10b981' : '#f59e0b'
                                            }}>
                                                {['APPROVED', 'TOKENIZED', 'LISTED'].includes(asset.status) ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAsset(asset);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="small secondary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                                >
                                                    Full Info
                                                </button>
                                                {asset.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleApproveAsset(asset.id)}
                                                        className="small"
                                                        style={{ background: 'var(--accent)', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
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
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <UserCheck className="text-accent" size={24} />
                    <h2 style={{ margin: 0 }}>Identity & Compliance</h2>
                </div>
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)' }}>
                                <th style={{ padding: '1rem' }}>User Email</th>
                                <th style={{ padding: '1rem' }}>KYC Status</th>
                                <th style={{ padding: '1rem' }}>Wallets</th>
                                <th style={{ padding: '1rem' }}>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '1rem' }}>{user.email}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: user.kycStatus === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: user.kycStatus === 'APPROVED' ? '#10b981' : '#ef4444'
                                        }}>
                                            {user.kycStatus}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {user.wallets?.length || 0} Connected
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>{user.role}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            {/* Asset Detail Modal */}
            {isDetailModalOpen && selectedAsset && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', position: 'relative' }}>
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                        >
                            Close
                        </button>

                        <h2 className="mb-2">{selectedAsset.name}</h2>
                        <div className="flex items-center gap-2 mb-6" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <span style={{ padding: '0.2rem 0.5rem', background: 'var(--glass)', borderRadius: '4px' }}>{selectedAsset.symbol}</span>
                            <span>•</span>
                            <span>{selectedAsset.type}</span>
                            <span>•</span>
                            <span style={{ color: selectedAsset.status === 'ONBOARDED' ? 'var(--accent)' : '#f59e0b' }}>{selectedAsset.status}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>User Valuation</h4>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${selectedAsset.valuation.toLocaleString()}</div>
                            </div>
                            <div>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>AI Recommended</h4>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa' }}>
                                    ${selectedAsset.aiPricing ? selectedAsset.aiPricing.toLocaleString() : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Asset Description</h4>
                            <p style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                {selectedAsset.description || "No description provided."}
                            </p>
                        </div>

                        <div className="mb-6">
                            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Location</h4>
                            <div style={{ fontSize: '0.9rem' }}>{selectedAsset.location || "Global / Digital"}</div>
                        </div>

                        {selectedAsset.aiReasoning && (
                            <div className="mb-6" style={{ background: 'rgba(96, 165, 250, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #60a5fa' }}>
                                <h4 style={{ color: '#60a5fa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertCircle size={16} /> AI Valuation Insights
                                </h4>
                                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                                    {selectedAsset.aiReasoning}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-8">
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Owner: <span style={{ color: 'var(--text-main)' }}>{selectedAsset.owner?.email}</span>
                            </div>
                            {selectedAsset.status === 'PENDING' && (
                                <button
                                    onClick={() => {
                                        handleApproveAsset(selectedAsset.id);
                                        setIsDetailModalOpen(false);
                                    }}
                                    style={{ background: 'var(--accent)', width: 'auto', padding: '0.75rem 2rem' }}
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
