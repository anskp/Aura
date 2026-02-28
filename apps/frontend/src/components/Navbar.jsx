import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShieldCheck, LogOut, Wallet } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="glass-card" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px' }}>
            <div className="flex items-center gap-4">
                <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.5rem', background: 'linear-gradient(to right, #6366f1, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
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

                <Link to="/kyc" className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                    <Wallet size={20} />
                    <span>KYC</span>
                </Link>

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
