import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Box, Calendar, MapPin, Tag, Activity } from 'lucide-react';

const AssetDashboard = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await api.get('/assets/my-assets');
            setAssets(res.data);
        } catch (err) {
            console.error('Failed to fetch assets:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <header className="flex justify-between items-center mb-8" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>My Assets</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your real-world assets and company entities.</p>
                </div>
                <button onClick={() => navigate('/assets/onboard')} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Onboard New Asset
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading assets...</div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    {assets.map(asset => (
                        <div key={asset.id} className="glass-card" style={{ padding: '1.5rem', transition: 'transform 0.2s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div style={{ background: 'var(--glass)', padding: '0.75rem', borderRadius: '12px', color: 'var(--accent)' }}>
                                    <Box size={24} />
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    background: asset.status === 'ONBOARDED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: asset.status === 'ONBOARDED' ? '#10b981' : '#f59e0b',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {asset.status}
                                </span>
                            </div>

                            <h3 style={{ marginBottom: '0.25rem' }}>{asset.name}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{asset.symbol}</p>

                            <div className="space-y-3" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Tag size={14} /> <span>{asset.type}</span>
                                </div>
                                {asset.location && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin size={14} /> <span>{asset.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={14} /> <span>Valuation: ${Number(asset.valuation).toLocaleString()}</span>
                                </div>
                                {asset.companyName && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={14} /> <span>Entity: {asset.companyName}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                                <button className="secondary" style={{ width: '100%' }} onClick={() => alert('Minting coming soon in Phase 3!')}>
                                    Mint RWA Token
                                </button>
                            </div>
                        </div>
                    ))}

                    {assets.length === 0 && (
                        <div className="glass-card col-span-3" style={{ padding: '4rem', textAlign: 'center' }}>
                            <Box size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                            <h3>No assets onboarded yet</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Start by onboarding your first real-world asset.</p>
                            <button onClick={() => navigate('/assets/onboard')} style={{ width: 'auto' }}>
                                Onboard Now
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssetDashboard;
