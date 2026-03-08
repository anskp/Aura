import React, { useState } from 'react';
import { X, Shield, Info, Loader2, CheckCircle2, Wallet, ArrowRight, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';
import api from '../../services/api';
import { BlockchainService } from '../../services/blockchain.service';
import contractData from '../../contracts/contracts.json';

const InvestmentModal = ({ asset, isOpen, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('IDLE'); // IDLE, APPROVING, DEPOSITING, SUCCESS
    const [txHash, setTxHash] = useState('');
    const [balance, setBalance] = useState('0');
    const [oracleStatus, setOracleStatus] = useState({ fresh: true, lastUpdate: '' });
    const [revertHelp, setRevertHelp] = useState(null);
    const [syncNeeded, setSyncNeeded] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            fetchDiagnostics();
        }
    }, [isOpen, asset.id]); // Asset ID is enough

    const fetchDiagnostics = async () => {
        if (isFetching) return;
        setIsFetching(true);
        try {
            const signer = await BlockchainService.getSigner();
            const userAddress = await signer.getAddress();

            // 1. Verify Contract Existence (Avoid BAD_DATA crash)
            const isValid = await BlockchainService.isContract(asset.stablecoinAddress);
            if (!isValid) {
                console.warn(`[Investment] Stablecoin address ${asset.stablecoinAddress} is dead on this network.`);
                setSyncNeeded(true);
                setBalance('0');
                setIsFetching(false);
                return;
            }
            setSyncNeeded(false);

            // 2. Fetch USDC Balance
            const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
            const usdc = new ethers.Contract(asset.stablecoinAddress, usdcAbi, signer);
            const bal = await usdc.balanceOf(userAddress);
            setBalance(ethers.formatUnits(bal, 6));

            // 3. Fetch Oracle Status
            const navOracleAddr = import.meta.env.VITE_NAV_ORACLE_ADDRESS;
            const poolId = ethers.encodeBytes32String(`POOL_${asset.id}`);
            const navOracleAbi = ["function latestNav(bytes32) view returns (uint256, uint256, bytes32)"];
            const navOracle = new ethers.Contract(navOracleAddr, navOracleAbi, signer);
            const [nav, timestamp, reportId] = await navOracle.latestNav(poolId);

            const lastDate = new Date(Number(timestamp) * 1000);
            const isFresh = (Date.now() / 1000) - Number(timestamp) < 86400 * 2; // 2 days
            setOracleStatus({
                fresh: isFresh && timestamp > 0n,
                lastUpdate: timestamp > 0n ? lastDate.toLocaleString() : 'Never'
            });
        } catch (e) {
            console.error("Failed to fetch diagnostics:", e);
        } finally {
            setIsFetching(false);
        }
    };

    const handleGetTokens = async () => {
        setLoading(true);
        setStatus('MINTING');
        try {
            const signer = await BlockchainService.getSigner();
            const address = await signer.getAddress();
            console.log(`[Action] Requesting Backend Faucet for ${address}...`);
            await api.post('/assets/faucet', { address });
            await fetchDiagnostics();
            alert("1,000 Mock USDC sent to your wallet via Backend Faucet!");
        } catch (e) {
            alert("Faucet failed: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
            setStatus('IDLE');
        }
    };

    if (!isOpen) return null;

    const handleInvest = async () => {
        if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount');

        console.log(`[User Action] Investing ${amount} into ${asset.name}...`);
        setLoading(true);
        try {
            const signer = await BlockchainService.getSigner();
            const amountWei = ethers.parseUnits(amount, 6);

            setStatus('APPROVING');
            const stablecoinAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
            const stablecoinContract = new ethers.Contract(asset.stablecoinAddress, stablecoinAbi, signer);
            const approveTx = await stablecoinContract.approve(asset.address, amountWei);
            await approveTx.wait();

            setStatus('DEPOSITING');
            const poolContract = new ethers.Contract(asset.address, contractData['LiquidityPool'].abi, signer);

            // Re-asserting health locally to provide better error messages if it fails gas estimation
            console.log("[Blockchain] Sending Invest transaction...");
            const depositTx = await poolContract.invest(amountWei, await signer.getAddress());
            const receipt = await depositTx.wait();

            setTxHash(receipt.hash);

            // Record investment in backend
            await api.post(`/assets/invest/${asset.pool.id}`, {
                investorAddress: await signer.getAddress(),
                amountPaid: parseFloat(amount),
                sharesReceived: parseFloat(amount), // AURAPS is 1:1 for now or based on preview
                txHash: receipt.hash
            });

            setStatus('SUCCESS');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 3000);

        } catch (err) {
            console.error('[Error] Investment failed:', err);

            // Helpful Diagnostics for the User
            const errorData = err.data || err.error?.data || "";
            if (errorData.includes("0x3938508e") || err.message?.includes("0x3938508e")) {
                setRevertHelp({
                    title: "Stale Oracle Data",
                    message: "The pool rejected this trade because the on-chain price (NAV) has not been updated recently.",
                    solution: "An Admin must go to the Dashboard and click 'Sync On-Chain Data' for this asset."
                });
            } else if (errorData.includes("0x0e5e0a05") || err.message?.includes("SystemPaused")) {
                setRevertHelp({
                    title: "Protocol Paused",
                    message: "The Proof-of-Reserve system has paused this pool due to a detected imbalance or manual override.",
                    solution: "Contact system administrator or check the asset's backing status."
                });
            } else if (err.message.includes('CALL_EXCEPTION') || err.message.includes('revert')) {
                setRevertHelp({
                    title: "Transaction Reverted",
                    message: "The blockchain rejected this trade. Possible reasons: Insufficient USDC balance, missing KYC/Identity check, or contract mismatch.",
                    solution: "Ensure you have enough USDC and your identity has been verified in the dashboard."
                });
            } else {
                alert('Investment failed: ' + (err.reason || err.message));
            }
            setStatus('IDLE');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-card animate-slide-up" style={{
                maxWidth: '480px',
                width: '100%',
                padding: '0',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem',
                    background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--card-border)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }} className="text-gradient">Confirm Investment</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>{asset.name} • Primary Pool</p>
                    </div>
                    <button onClick={onClose} className="secondary" style={{ width: 'auto', padding: '0.5rem', borderRadius: '50%' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '2rem' }}>
                    {status === 'SUCCESS' ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <CheckCircle2 size={40} style={{ color: 'var(--accent)', margin: 'auto' }} />
                            </div>
                            <h3 style={{ marginBottom: '0.5rem' }}>Transaction Successful!</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your investment has been processed on-chain.</p>
                            <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}
                            >
                                View Transaction <ExternalLink size={14} />
                            </a>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                gap: '1rem',
                                marginBottom: '2rem'
                            }}>
                                <Shield className="text-primary" size={24} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>Institutional Grade Compliance</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ERC-3643 verified asset. Your identity has been whitelisted.</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount to Invest</label>
                                    <span style={{ fontSize: '0.75rem', color: Number(balance) < Number(amount) ? '#ef4444' : 'var(--text-muted)' }}>
                                        Wallet Balance: {Number(balance).toLocaleString()} USDC
                                    </span>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        style={{
                                            fontSize: '2rem',
                                            padding: '1rem 1.5rem',
                                            fontWeight: 700,
                                            height: 'auto',
                                            textAlign: 'left'
                                        }}
                                        disabled={loading}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        right: '1.5rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontWeight: 800,
                                        color: 'var(--text-muted)'
                                    }}>
                                        USDC
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Asset NAV:</span>
                                    <span style={{ fontWeight: 600 }}>${asset.nav?.toLocaleString()}</span>
                                </div>

                                {!oracleStatus.fresh && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '0.75rem',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        color: '#f59e0b',
                                        display: 'flex',
                                        gap: '0.5rem',
                                        alignItems: 'center'
                                    }}>
                                        <Info size={14} />
                                        <span>On-chain data is stale (Updated: {oracleStatus.lastUpdate}). Please sync this asset.</span>
                                    </div>
                                )}

                                {Number(balance) === 0 && (
                                    <button
                                        onClick={handleGetTokens}
                                        className="secondary small"
                                        style={{ marginTop: '1rem', width: '100%', fontSize: '0.75rem' }}
                                        disabled={loading}
                                    >
                                        <Wallet size={14} style={{ marginRight: '0.5rem' }} /> Get 1,000 Test USDC
                                    </button>
                                )}
                            </div>

                            {revertHelp && (
                                <div className="glass-card" style={{
                                    marginBottom: '1.5rem',
                                    padding: '1rem',
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{revertHelp.title}</div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{revertHelp.message}</p>
                                    <div style={{ marginTop: '0.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'white' }}>Solution: {revertHelp.solution}</div>
                                </div>
                            )}

                            <button
                                onClick={handleInvest}
                                disabled={loading}
                                style={{
                                    height: '60px',
                                    fontSize: '1.125rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        <span>{
                                            status === 'APPROVING' ? 'Approving USDC...' :
                                                status === 'DEPOSITING' ? 'Executing Deposit...' :
                                                    status === 'MINTING' ? 'Minting Test Tokens...' :
                                                        'Processing...'
                                        }</span>
                                    </>
                                ) : (
                                    <>Confirm Investment <ArrowRight size={20} /></>
                                )}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Info size={14} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transactions are direct and instantaneous.</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvestmentModal;
