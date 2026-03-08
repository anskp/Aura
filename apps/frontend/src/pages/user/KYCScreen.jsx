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
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="ml-4 text-slate-500 font-medium">Checking verification status...</p>
        </div>
    );

    return (
        <div className="flex justify-center items-center min-h-[80vh] p-4 lg:p-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-8 lg:p-12 shadow-sm w-full max-w-2xl text-center">

                <div className="flex justify-center mb-6">
                    {(!kycStatus || kycStatus === 'NOT_STARTED') && <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><Shield size={48} /></div>}
                    {(kycStatus === 'PENDING' || kycStatus === 'IN_REVIEW') && <div className="p-4 bg-primary/10 rounded-full text-primary"><Clock size={48} /></div>}
                    {kycStatus === 'APPROVED' && <div className="p-4 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-full text-emerald-500"><CheckCircle size={48} /></div>}
                    {kycStatus === 'REJECTED' && <div className="p-4 bg-red-100/50 dark:bg-red-900/30 rounded-full text-red-500"><AlertCircle size={48} /></div>}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 bg-none">Identity Verification</h2>

                {redirectMessage && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800 mb-6">
                        {redirectMessage}
                    </div>
                )}

                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    To comply with global financial regulations and access the AURA RWA Marketplace, please complete your KYC.
                </p>

                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Status:</p>
                    <h3 className={`text-lg font-bold m-0 ${kycStatus === 'APPROVED' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        {kycStatus?.replace('_', ' ') || 'NOT STARTED'}
                    </h3>
                    {kycReason && (
                        <p className="text-red-500 text-sm mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50 inline-block">
                            <span className="font-bold">Reason:</span> {kycReason}
                        </p>
                    )}
                </div>

                {(!kycStatus || kycStatus === 'NOT_STARTED' || kycStatus === 'REJECTED') && !sdkLoading && !showContinueButton && (
                    <button
                        onClick={launchWebSDK}
                        className="btn-primary w-full md:w-auto px-10 py-3.5 text-base border shadow-none"
                    >
                        {kycStatus === 'REJECTED' ? 'Retry Verification' : 'Start Verification'}
                    </button>
                )}

                {(kycStatus === 'PENDING' || kycStatus === 'IN_REVIEW') && !showContinueButton && (
                    <div className="space-y-6">
                        <p className="text-slate-500 text-sm">
                            Your documents are under review. This usually takes a few minutes.
                        </p>
                        <div className="flex flex-col md:flex-row gap-3 justify-center items-center">
                            <button onClick={fetchKYCStatus} className="btn-secondary flex items-center gap-2 border shadow-none px-6">
                                <RefreshCcw size={18} /> Refresh Status
                            </button>
                            <button
                                onClick={handleVerifyCompletion}
                                disabled={verifying}
                                className="btn-primary flex items-center gap-2 border shadow-none px-6"
                            >
                                {verifying ? 'Checking...' : 'Check Sumsub Sync'}
                            </button>
                            {!sdkLoading && (
                                <button onClick={launchWebSDK} className="btn-secondary border shadow-none px-6">
                                    Open Verification Wall
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {kycStatus === 'APPROVED' && (
                    <div className="space-y-6">
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                            You are fully verified! You can now access the marketplace and trade assets.
                        </p>
                        <button
                            onClick={async () => {
                                await refreshUser();
                                navigate('/dashboard');
                            }}
                            className="btn-primary flex items-center gap-2 mx-auto justify-center px-8 border shadow-none"
                        >
                            Go to Marketplace <ExternalLink size={18} />
                        </button>
                    </div>
                )}

                {sdkLoading && (
                    <div className="flex justify-center items-center mt-6 text-slate-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-3"></div>
                        Initializing secure verification session...
                    </div>
                )}

                <div id="sumsub-websdk-container" className="mt-8 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800"></div>

                {showContinueButton && (
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={handleVerifyCompletion}
                            disabled={verifying}
                            className="btn-primary w-full md:w-auto px-10 py-3.5 text-base border shadow-none"
                        >
                            {verifying ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Verifying...
                                </span>
                            ) : 'Continue to Marketplace'}
                        </button>
                        <p className="text-xs text-slate-500 mt-4">
                            Clicking this will sync your status with our system.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYCScreen;
