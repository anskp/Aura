import React from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Shield, CheckCircle, Clock } from 'lucide-react';

const KYCScreen = () => {
    const { user, login } = useAuth(); // We can re-fetch user on login call if we update context, but let's just refresh page or rely on status

    const handleSubmit = async () => {
        try {
            await api.post('/users/kyc/submit');
            window.location.reload(); // Simple way to refresh user status
        } catch (err) {
            alert('Submission failed');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                    {user?.kycStatus === 'PENDING' && <Shield size={64} style={{ color: 'var(--text-muted)' }} />}
                    {user?.kycStatus === 'SUBMITTED' && <Clock size={64} style={{ color: 'var(--primary)' }} />}
                    {user?.kycStatus === 'APPROVED' && <CheckCircle size={64} style={{ color: 'var(--accent)' }} />}
                </div>

                <h2>Identity Verification</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    To comply with global financial regulations, please complete your KYC verification.
                </p>

                <div style={{ background: 'var(--glass)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Status:</p>
                    <h3 style={{ margin: 0, color: user?.kycStatus === 'APPROVED' ? 'var(--accent)' : 'inherit' }}>
                        {user?.kycStatus || 'NOT STARTED'}
                    </h3>
                </div>

                {user?.kycStatus === 'PENDING' && (
                    <button onClick={handleSubmit}>Submit Verification</button>
                )}

                {user?.kycStatus === 'SUBMITTED' && (
                    <p style={{ color: 'var(--text-muted)' }}>Your documents are being reviewed by the admin. Please check back later.</p>
                )}

                {user?.kycStatus === 'APPROVED' && (
                    <p style={{ color: 'var(--accent)' }}>You are fully verified and can now participate in all liquidity pools.</p>
                )}
            </div>
        </div>
    );
};

export default KYCScreen;
