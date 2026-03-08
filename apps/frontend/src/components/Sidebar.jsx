import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Overview', icon: 'pie_chart', path: '/dashboard' },
        { label: 'Portfolio & Wallet', icon: 'account_balance_wallet', path: '/portfolio' },
        { label: 'Marketplace', icon: 'storefront', path: '/marketplace' },
        { label: 'Assets', icon: 'category', path: '/assets' },
        { label: 'Settings', icon: 'settings', path: '/settings' },
    ];

    if (user?.role === 'ADMIN') {
        navItems.push({ label: 'Admin', icon: 'shield_person', path: '/admin' });
    }

    return (
        <aside className="w-72 bg-white dark:bg-background-dark border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6 h-screen sticky top-0">
            <div className="flex flex-col gap-8">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight text-primary m-0 bg-none bg-clip-border text-fill-current leading-none">AURA</h1>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">RWA Protocol</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            className={({ isActive }) =>
                                isActive && item.path !== '#' ? 'sidebar-link-active' : 'sidebar-link'
                            }
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="text-sm font-semibold">{item.label}</span>
                            {item.tag && (
                                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${item.tag === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {item.tag}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                    <p className="text-xs font-bold text-primary uppercase mb-1 m-0 pb-1">AI Valuation Status</p>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">System monitoring assets globally. Accuracy: 99.4%</p>
                </div>

                <div className="flex items-center gap-3 px-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
                        <img
                            className="w-full h-full object-cover"
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                            alt="User profile"
                        />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <p className="text-sm font-bold truncate max-w-[120px] m-0">{user?.email?.split('@')[0] || 'User'}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider m-0 py-1">{user?.role}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="ml-auto text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none p-0 w-auto cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
