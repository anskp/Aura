import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCheck, UserX, AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleKYC = async (userId, status) => {
        try {
            await api.post('/users/admin/kyc/approve', { userId, status });
            fetchUsers();
        } catch (err) {
            alert('Action failed');
        }
    };

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-4">
                <h2>Admin Governance</h2>
                <div style={{ padding: '0.5rem 1rem', background: 'var(--danger)', borderRadius: '8px', fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={14} /> 2 Pending Approvals
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: 'var(--glass)' }}>
                            <th style={{ padding: '1rem' }}>User Email</th>
                            <th style={{ padding: '1rem' }}>KYC Status</th>
                            <th style={{ padding: '1rem' }}>Wallets</th>
                            <th style={{ padding: '1rem' }}>Actions</th>
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
                                        color: user.kycStatus === 'APPROVED' ? 'var(--accent)' : 'inherit'
                                    }}>
                                        {user.kycStatus}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {user.wallets?.length || 0} Connected
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {user.kycStatus === 'SUBMITTED' && (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleKYC(user.id, 'APPROVED')}
                                                style={{ width: 'auto', background: 'var(--accent)', padding: '0.4rem' }}
                                            >
                                                <UserCheck size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleKYC(user.id, 'REJECTED')}
                                                style={{ width: 'auto', background: 'var(--danger)', padding: '0.4rem' }}
                                            >
                                                <UserX size={18} />
                                            </button>
                                        </div>
                                    )}
                                    {user.kycStatus !== 'SUBMITTED' && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No action required</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
