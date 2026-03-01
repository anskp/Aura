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


    return (
        <div className="container">
            <div className="flex justify-between items-center mb-4">
                <h2>Admin Governance</h2>
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
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Automated via Sumsub</span>
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
