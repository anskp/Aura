import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Wallet, Plus, Globe, ExternalLink, Activity } from 'lucide-react';
import { ethers } from 'ethers';

const UserDashboard = () => {
    const { user } = useAuth();
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask');
            return;
        }

        setConnecting(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const network = await provider.getNetwork();

            let chain = 'UNKNOWN';
            const chainId = Number(network.chainId);

            if (chainId === 11155111) chain = 'ETH_SEP';
            if (chainId === 80002) chain = 'AMOY';
            if (chainId === 43113) chain = 'FUJI';

            await api.post('/wallets', { address: accounts[0], chain });
            fetchWallets();
        } catch (err) {
            alert(err.response?.data?.error || 'Wallet connection failed');
        } finally {
            setConnecting(false);
        }
    };

    const pools = [
        { id: 1, name: 'Gold Reserve Pool', asset: 'Aurum-1', yield: '8.5%', nav: '$1,240.00', status: 'Active' },
        { id: 2, name: 'Real Estate Fund', asset: 'Vesta-Alpha', yield: '12.2%', nav: '$45,000.00', status: 'Active' },
        { id: 3, name: 'US Treasury Bills', asset: 'Yield-X', yield: '5.1%', nav: '$10,000,000.00', status: 'Paused' },
    ];

    return (
        <div className="container">
            <div className="grid grid-cols-3 gap-4 mb-4" style={{ marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Connected Wallets</p>
                    <h2 style={{ margin: '0.5rem 0', fontSize: '2rem' }}>{wallets.length}</h2>
                    <div className="flex items-center gap-4" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
                        <Activity size={14} /> Multi-chain active
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>KYC Status</p>
                    <h2 style={{ margin: '0.5rem 0', fontSize: '2rem', color: user?.kycStatus === 'APPROVED' ? 'var(--accent)' : 'var(--text-main)' }}>
                        {user?.kycStatus || 'PENDING'}
                    </h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Assets</p>
                    <h2 style={{ margin: '0.5rem 0', fontSize: '2rem' }}>3</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Yield generating</p>
                </div>
            </div>

            <section className="mb-4" style={{ marginBottom: '3rem' }}>
                <div className="flex justify-between items-center mb-4">
                    <h3>Connected Wallets</h3>
                    <button onClick={connectWallet} disabled={connecting} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> {connecting ? 'Connecting...' : 'Connect New Wallet'}
                    </button>
                </div>
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'var(--glass)' }}>
                                <th style={{ padding: '1rem' }}>Address</th>
                                <th style={{ padding: '1rem' }}>Network</th>
                                <th style={{ padding: '1rem' }}>Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wallets.map(w => (
                                <tr key={w.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{w.address}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: 'var(--glass)', fontSize: '0.75rem' }}>
                                            {w.chain}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {wallets.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No wallets connected yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section>
                <h3>Marketplace / Pools</h3>
                <div className="grid grid-cols-3 gap-4">
                    {pools.map(pool => (
                        <div key={pool.id} className="glass-card" style={{ padding: '1rem' }}>
                            <div style={{ height: '160px', background: 'var(--glass)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <Globe size={48} />
                            </div>
                            <h4>{pool.name}</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{pool.asset}</p>
                            <div className="flex justify-between mb-4">
                                <span style={{ fontSize: '0.875rem' }}>Yield</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{pool.yield}</span>
                            </div>
                            <div className="flex justify-between mb-4">
                                <span style={{ fontSize: '0.875rem' }}>NAV</span>
                                <span>{pool.nav}</span>
                            </div>
                            <button className="secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                View Details <ExternalLink size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default UserDashboard;
