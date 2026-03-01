import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import snsWebSdk from '@sumsub/websdk';
import api from '../../services/api';
import { Shield, CheckCircle, Clock, AlertCircle, RefreshCcw, ExternalLink } from 'lucide-react';

const KYCScreen = () => {
    const { refreshUser } = useAuth();
    const [kycStatus, setKycStatus] = useState(null);
    const [kycReason, setKycReason] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sdkLoading, setSdkLoading] = useState(false);
    const [showContinueButton, setShowContinueButton] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const redirectMessage = location.state?.message;

    const fetchKYCStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/kyc/status');
            setKycStatus(res.data.kycStatus);
            setKycReason(res.data.kycReason);
        } catch (err) {
            console.error('Failed to fetch KYC status', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKYCStatus();
    }, [fetchKYCStatus]);

    const handleVerifyCompletion = async () => {
        try {
            setVerifying(true);
            const res = await api.post('/kyc/verify-completion');

            if (res.data.status === 'APPROVED') {
                await refreshUser();
                navigate('/dashboard');
            } else if (res.data.status === 'IN_REVIEW') {
                alert('Your verification is still under review. Please wait a moment.');
                setKycStatus('IN_REVIEW');
                setShowContinueButton(false);
            } else if (res.data.status === 'REJECTED') {
                alert('Verification was rejected. Please check the reason and try again.');
                setKycStatus('REJECTED');
                setShowContinueButton(false);
            }
        } catch (err) {
            console.error('Verification check failed', err);
            alert('Failed to verify completion. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const launchWebSDK = async () => {
        setSdkLoading(true);
        setShowContinueButton(false);
        try {
            const res = await api.post('/kyc/token');
            const accessToken = res.data.token;

            const snsWebSdkInstance = snsWebSdk.init(
                accessToken,
                () => api.post('/kyc/token').then(r => r.data.token)
            )
                .withConf({
                    lang: 'en',
                })
                .on('onReady', () => {
                    console.log('Sumsub SDK ready');
                    setSdkLoading(false);
                })
                .on('onStatusChanged', (payload) => {
                    console.log('Sumsub status changed', payload);
                    // Broadening to any terminal state to ensure the button appears
                    if (['SUBMITTED', 'COMPLETED', 'APPROVED', 'REJECTED'].includes(payload)) {
                        setShowContinueButton(true);
                    }
                })
                .on('onError', (error) => {
                    console.error('Sumsub SDK error', error);
                    alert('Verification error. Please try again.');
                    setSdkLoading(false);
                })
                .build();

            snsWebSdkInstance.launch('#sumsub-websdk-container');
        } catch (err) {
            console.error('Failed to launch SDK', err);
            alert('Failed to initialize verification.');
            setSdkLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner"></div>
            <p style={{ marginLeft: '1rem' }}>Checking verification status...</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>

                <div style={{ marginBottom: '2rem' }}>
                    {(!kycStatus || kycStatus === 'NOT_STARTED') && <Shield size={64} style={{ color: 'var(--text-muted)' }} />}
                    {(kycStatus === 'PENDING' || kycStatus === 'IN_REVIEW') && <Clock size={64} style={{ color: 'var(--primary)' }} />}
                    {kycStatus === 'APPROVED' && <CheckCircle size={64} style={{ color: 'var(--accent)' }} />}
                    {kycStatus === 'REJECTED' && <AlertCircle size={64} style={{ color: 'var(--error, #ef4444)' }} />}
                </div>

                <h2>Identity Verification</h2>

                {redirectMessage && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {redirectMessage}
                    </div>
                )}

                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    To comply with global financial regulations and access the AURA RWA Marketplace, please complete your KYC.
                </p>

                <div style={{ background: 'var(--glass)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Status:</p>
                    <h3 style={{ margin: 0, color: kycStatus === 'APPROVED' ? 'var(--accent)' : 'inherit' }}>
                        {kycStatus?.replace('_', ' ') || 'NOT STARTED'}
                    </h3>
                    {kycReason && (
                        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            Reason: {kycReason}
                        </p>
                    )}
                </div>

                {(!kycStatus || kycStatus === 'NOT_STARTED' || kycStatus === 'REJECTED') && !sdkLoading && !showContinueButton && (
                    <button onClick={launchWebSDK} style={{ width: 'auto', padding: '1rem 2rem' }}>
                        {kycStatus === 'REJECTED' ? 'Retry Verification' : 'Start Verification'}
                    </button>
                )}

                {(kycStatus === 'PENDING' || kycStatus === 'IN_REVIEW') && !showContinueButton && (
                    <div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Your documents are under review. This usually takes a few minutes.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={fetchKYCStatus} className="secondary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCcw size={18} /> Refresh Status
                            </button>
                            <button
                                onClick={handleVerifyCompletion}
                                disabled={verifying}
                                style={{ width: 'auto', background: 'var(--primary)', color: 'white' }}
                            >
                                {verifying ? 'Checking...' : 'Check Sumsub Sync'}
                            </button>
                            {!sdkLoading && (
                                <button onClick={launchWebSDK} className="secondary" style={{ width: 'auto' }}>
                                    Open Verification Wall
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {kycStatus === 'APPROVED' && (
                    <div>
                        <p style={{ color: 'var(--accent)', marginBottom: '1.5rem' }}>
                            You are fully verified! You can now access the marketplace and trade assets.
                        </p>
                        <button
                            onClick={async () => {
                                await refreshUser();
                                navigate('/dashboard');
                            }}
                            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                        >
                            Go to Marketplace <ExternalLink size={18} />
                        </button>
                    </div>
                )}

                {sdkLoading && <p>Initializing secure verification session...</p>}

                <div id="sumsub-websdk-container" style={{ marginTop: '2rem', borderRadius: '12px', overflow: 'hidden' }}></div>

                {showContinueButton && (
                    <div style={{ marginTop: '2rem' }}>
                        <button
                            onClick={handleVerifyCompletion}
                            disabled={verifying}
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--bg)',
                                fontWeight: 'bold',
                                padding: '1rem 2.5rem'
                            }}
                        >
                            {verifying ? 'Verifying...' : 'Continue to Marketplace'}
                        </button>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                            Clicking this will sync your status with our system.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYCScreen;
