import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShieldCheck, LogOut, Wallet, Box, ShoppingBag } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const kycStatus = user?.kycStatus || null;

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getStatusColor = () => {
        switch (kycStatus) {
            case 'APPROVED': return '#10b981'; // Green
            case 'PENDING':
            case 'IN_REVIEW': return '#f59e0b'; // Yellow
            case 'REJECTED': return '#ef4444'; // Red
            default: return '#9ca3af'; // Gray
        }
    };

    return (
        <nav className="glass-card" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px' }}>
            <div className="flex items-center gap-4">
                <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.5rem', background: 'linear-gradient(to right, #6366f1, #10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
                    AURA
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </Link>

                {user.role === 'ADMIN' && (
                    <Link to="/admin" className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                        <ShieldCheck size={20} />
                        <span>Admin</span>
                    </Link>
                )}

                {user.role === 'USER' && (
                    <>
                        <Link to="/dashboard" className="flex items-center gap-4" style={{ color: 'var(--text-muted)', position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <ShieldCheck size={20} />
                            <span>KYC</span>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: getStatusColor(),
                                marginLeft: '6px',
                                boxShadow: `0 0 8px ${getStatusColor()}80`
                            }}></div>
                        </Link>

                        <Link to="/assets" className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                            <Box size={20} />
                            <span>Assets</span>
                        </Link>

                        <Link to="/marketplace" className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                            <ShoppingBag size={20} />
                            <span>Marketplace</span>
                        </Link>
                    </>
                )}

                <div style={{ height: '24px', width: '1px', background: 'var(--card-border)', margin: '0 1rem' }}></div>

                <div className="flex items-center gap-4">
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user.email}</span>
                    <button onClick={handleLogout} className="secondary" style={{ width: 'auto', padding: '0.5rem' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
