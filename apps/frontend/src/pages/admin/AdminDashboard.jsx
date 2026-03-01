import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCheck, UserX, AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                                <th style={{ padding: '1rem' }}>Owner</th>
                                <th style={{ padding: '1rem' }}>Valuation</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
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
                                        <td style={{ padding: '1rem' }}>{asset.owner?.email || 'Unknown'}</td>
                                        <td style={{ padding: '1rem' }}>${asset.valuation.toLocaleString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                width: 'fit-content',
                                                background: asset.status === 'ONBOARDED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: asset.status === 'ONBOARDED' ? '#10b981' : '#f59e0b'
                                            }}>
                                                {asset.status === 'ONBOARDED' ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {asset.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleApproveAsset(asset.id)}
                                                    className="small"
                                                    style={{ background: 'var(--accent)', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                                >
                                                    Approve & Onboard
                                                </button>
                                            )}
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
        </div>
    );
};

export default AdminDashboard;
