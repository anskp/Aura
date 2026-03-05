import React from 'react';
import { Palette, Landmark, Coins, Leaf, Package, ArrowUpRight, TrendingUp, Users } from 'lucide-react';

const AssetCard = ({ asset, onInvest }) => {
    const getIcon = () => {
        switch (asset.type) {
            case 'ART': return <Palette size={24} />;
            case 'METAL': return <Coins size={24} />;
            case 'REAL_ESTATE': return <Landmark size={24} />;
            case 'CARBON': return <Leaf size={24} />;
            default: return <Package size={24} />;
        }
    };

    return (
        <div className="glass-card glow-card animate-slide-up" style={{ padding: '0', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                height: '160px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderBottom: '1px solid var(--card-border)'
            }}>
                <div className="badge badge-primary" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                    {asset.type}
                </div>
                <div style={{ color: 'var(--primary)', opacity: 0.8 }}>
                    {getIcon()}
                </div>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', marginBottom: '0.5rem' }} className="text-gradient">
                    {asset.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5', height: '2.6rem', overflow: 'hidden' }}>
                    {asset.description || 'Institutional grade RWA asset fractionalized on AURA.'}
                </p>

                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <TrendingUp size={14} className="text-accent" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NAV Price</span>
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>${asset.nav?.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Users size={14} style={{ color: '#60a5fa' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liquidity</span>
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent)' }}>
                            ${asset.totalLiquidity ? parseFloat(asset.totalLiquidity).toLocaleString() : '0'}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onInvest}
                    className="flex items-center justify-center gap-2"
                >
                    Invest Now <ArrowUpRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default AssetCard;
