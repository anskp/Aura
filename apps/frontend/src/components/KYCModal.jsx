import React, { useState, useEffect } from 'react';
import snsWebSdk from '@sumsub/websdk';
import api from '../services/api';
import { X } from 'lucide-react';

const KYCModal = ({ isOpen, onClose, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const handleClose = async () => {
        setSyncing(true);
        try {
            // Always try to sync on close to ensure latest status is captured
            await api.post('/kyc/verify-completion');
            if (onComplete) {
                await onComplete();
            } else {
                onClose();
            }
        } catch (err) {
            console.error('Failed to sync on close', err);
            onClose();
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            launchWebSDK();
        }
    }, [isOpen]);

    const launchWebSDK = async () => {
        setLoading(true);
        setError(null);
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
                    setLoading(false);
                })
                .on('onStatusChanged', async (payload) => {
                    console.log('Sumsub status changed', payload);
                    if (['COMPLETED', 'APPROVED'].includes(payload)) {
                        // Trigger backend sync immediately when they finish
                        try {
                            await api.post('/kyc/verify-completion');
                            if (onComplete) onComplete();
                        } catch (err) {
                            console.error('Failed to sync KYC completion', err);
                        }
                    }
                })
                .on('onError', (error) => {
                    console.error('Sumsub SDK error', error);
                    setError('Verification error. Please try again.');
                    setLoading(false);
                })
                .build();

            snsWebSdkInstance.launch('#sumsub-modal-container');
        } catch (err) {
            console.error('Failed to launch SDK', err);
            setError('Failed to initialize verification.');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem'
        }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                padding: '2rem'
            }}>
                <button
                    onClick={handleClose}
                    disabled={syncing}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        width: 'auto',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {syncing && <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'var(--accent)' }}></div>}
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '1.5rem' }}>Identity Verification</h2>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="spinner"></div>
                        <p style={{ marginTop: '1rem' }}>Initializing secure session...</p>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        {error}
                        <button onClick={launchWebSDK} style={{ marginTop: '0.5rem', width: 'auto' }}>Retry</button>
                    </div>
                )}

                <div id="sumsub-modal-container"></div>

                <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '1.5rem',
                    textAlign: 'center'
                }}>
                    Your data is processed securely by Sumsub. Closing this window will not cancel your progress.
                </p>
            </div>
        </div>
    );
};

export default KYCModal;
