import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AssetCard from '../../components/marketplace/AssetCard';
import InvestmentModal from '../../components/marketplace/InvestmentModal';
import { ShoppingBag, Filter, Palette, Landmark, Coins, Leaf, Package, BarChart3, Globe, ShieldCheck } from 'lucide-react';

const Marketplace = () => {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedPool, setSelectedPool] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchPools = async () => {
        try {
            const response = await api.get('/marketplace/pools');
            setPools(response.data);
        } catch (error) {
            console.error('Error fetching pools:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPools();
    }, []);

    const handleInvestClick = (pool) => {
        setSelectedPool({
            ...pool.asset,
            pool: pool,
            address: pool.address,
            stablecoinAddress: pool.stablecoinAddress,
            assetId: pool.asset.id
        });
        setIsModalOpen(true);
    };

    const filteredPools = filter === 'ALL'
        ? pools
        : pools.filter(p => p.asset.type === filter);

    const categories = [
        { id: 'ALL', label: 'All Assets', icon: <Package size={18} /> },
        { id: 'ART', label: 'Fine Art', icon: <Palette size={18} /> },
        { id: 'METAL', label: 'Precious Metals', icon: <Coins size={18} /> },
        { id: 'REAL_ESTATE', label: 'Real Estate', icon: <Landmark size={18} /> },
        { id: 'CARBON', label: 'Carbon Credits', icon: <Leaf size={18} /> },
    ];

    if (loading) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'borderGlow 1s infinite linear', margin: '0 auto 1rem' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Loading Marketplace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ padding: '2rem' }}>
            {/* Header Section */}
            <header style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
                        <ShoppingBag size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.5rem' }} className="text-gradient">AURA Marketplace</h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Institutional RWA Exchange & Primary Issuance Hub</p>
                    </div>
                </div>

                {/* Market Stats */}
                <div className="grid grid-cols-3 gap-6" style={{ marginTop: '2rem' }}>
                    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <BarChart3 className="text-accent" />
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total TVL</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>$1.2M+</div>
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Globe style={{ color: '#60a5fa' }} />
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assets Listed</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{pools.length} Assets</div>
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ShieldCheck style={{ color: '#fbbf24' }} />
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compliance</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>ERC-3643 Verified</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filter Section */}
            <section style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter by Category</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className={filter === cat.id ? '' : 'secondary'}
                            style={{
                                width: 'auto',
                                padding: '0.6rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                whiteSpace: 'nowrap',
                                borderRadius: '999px',
                                border: filter === cat.id ? 'none' : '1px solid var(--card-border)',
                                fontSize: '0.875rem'
                            }}
                        >
                            {cat.icon}
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Assets Grid */}
            {filteredPools.length === 0 ? (
                <div className="glass-card animate-slide-up" style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
                    <Package size={48} style={{ color: 'var(--card-border)', marginBottom: '1.5rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>No assets found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Try selecting a different category or check back later for new issuances.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-8">
                    {filteredPools.map(pool => (
                        <AssetCard
                            key={pool.id}
                            asset={{ ...pool.asset, totalLiquidity: pool.totalLiquidity }}
                            onInvest={() => handleInvestClick(pool)}
                        />
                    ))}
                </div>
            )}

            {selectedPool && (
                <InvestmentModal
                    asset={selectedPool}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchPools}
                />
            )}
        </div>
    );
};

export default Marketplace;
