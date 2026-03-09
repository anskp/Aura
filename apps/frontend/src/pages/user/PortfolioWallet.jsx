import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import api from '../../services/api';
import { BlockchainService } from '../../services/blockchain.service';
import { syncActiveWalletToBackend } from '../../utils/walletSync';

const POOL_ABI = [
    "function redeem(uint256 shares, address receiver) external returns (uint256)",
    "function previewRedeem(uint256 shares) view returns (uint256)"
];
const CCIP_SENDER_ABI = [
    "function rwaToken() view returns (address)",
    "function bridgeToFuji(address receiver, uint256 amount, bytes data) returns (bytes32)"
];
const ERC20_ABI = [
    "function decimals() view returns (uint8)"
];
const BRIDGEABLE_TOKEN_ABI = [
    "function BRIDGE_ROLE() view returns (bytes32)"
];

const fmt = (n, d = 2) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtFromRaw = (raw, decimals = 18) => {
    try {
        const base = ethers.formatUnits(BigInt(raw || '0'), decimals);
        const [intPart, fracPart = ''] = base.split('.');
        return `${intPart}.${fracPart.padEnd(decimals, '0').slice(0, decimals)}`;
    } catch {
        return `0.${'0'.repeat(decimals)}`;
    }
};

const txLabel = (action) => {
    switch (action) {
        case 'INVEST': return 'Purchase';
        case 'REDEEM': return 'Settlement';
        case 'SYNC_ORACLE': return 'Oracle Sync';
        default: return action || 'Tx';
    }
};
const ETHERSCAN_TX_BASE = import.meta.env.VITE_ETHERSCAN_TX_BASE_URL || 'https://sepolia.etherscan.io/tx/';

const statusClass = (status) => {
    if (status === 'SUCCESS') return 'bg-emerald-50 text-emerald-700';
    if (status === 'FAILED') return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
};

const StepPill = ({ label, state }) => {
    const cls = state === 'done'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : state === 'active'
            ? 'bg-blue-50 text-blue-700 border-blue-100'
            : state === 'error'
                ? 'bg-red-50 text-red-700 border-red-100'
                : 'bg-slate-50 text-slate-400 border-slate-200';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold border ${cls}`}>{label}</span>;
};

const PortfolioWallet = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [bridgeOpen, setBridgeOpen] = useState(false);
    const [bridgePosition, setBridgePosition] = useState(null);
    const [bridgeAmount, setBridgeAmount] = useState('');
    const [bridgeReceiver, setBridgeReceiver] = useState('');
    const [bridgeStatus, setBridgeStatus] = useState('idle');
    const [bridgeHash, setBridgeHash] = useState('');

    const [redeemOpen, setRedeemOpen] = useState(false);
    const [redeemPosition, setRedeemPosition] = useState(null);
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeemStatus, setRedeemStatus] = useState('idle');
    const [redeemHash, setRedeemHash] = useState('');
    const [txnOpen, setTxnOpen] = useState(false);
    const [txnLoading, setTxnLoading] = useState(false);
    const [txnTitle, setTxnTitle] = useState('');
    const [assetTxns, setAssetTxns] = useState([]);

    const fetchSummary = async () => {
        setLoading(true);
        setError('');
        try {
            // Ensure backend portfolio queries include the currently active wallet.
            try {
                const signer = await BlockchainService.getSigner();
                await syncActiveWalletToBackend(signer);
            } catch {
                // Non-blocking: portfolio can still load from existing linked wallets.
            }

            const res = await api.get('/portfolio/summary');
            setSummary(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const positions = summary?.positions || [];
    const walletBalances = summary?.walletBalances || [];
    const recentTransactions = summary?.recentTransactions || [];

    const timeline = useMemo(() => {
        return recentTransactions.map((tx) => ({
            id: tx.id,
            label: txLabel(tx.actionType),
            status: tx.status,
            createdAt: tx.createdAt,
            hash: tx.txHash
        }));
    }, [recentTransactions]);

    const openBridge = async (position) => {
        setBridgePosition(position);
        setBridgeAmount('');
        setBridgeStatus('idle');
        setBridgeHash('');
        try {
            const signer = await BlockchainService.getSigner();
            setBridgeReceiver(await signer.getAddress());
        } catch {
            setBridgeReceiver('');
        }
        setBridgeOpen(true);
    };

    const submitBridge = async () => {
        if (!bridgePosition) return;
        if (!bridgeAmount || Number(bridgeAmount) <= 0) return;

        const maxSharesWei = BigInt(bridgePosition.sharesRaw || '0');
        let requestedWei = 0n;
        try {
            requestedWei = ethers.parseEther(bridgeAmount);
        } catch {
            return;
        }
        if (requestedWei > maxSharesWei) return;
        if (!bridgeReceiver) return;

        try {
            setBridgeStatus('submitting');
            const signer = await BlockchainService.getSigner();
            const envSenderAddress = import.meta.env.VITE_CCIP_SENDER_ADDRESS;
            const candidateTokenAddress = bridgePosition.poolAddress;
            try {
                const bridgeableProbe = new ethers.Contract(candidateTokenAddress, BRIDGEABLE_TOKEN_ABI, signer);
                await bridgeableProbe.BRIDGE_ROLE();
            } catch {
                throw new Error(
                    `This position token (${candidateTokenAddress}) is not CCIP bridge-enabled. ` +
                    `It must expose BRIDGE_ROLE + bridgeBurn/bridgeMint (AuraRwaToken-compatible).`
                );
            }

            if (envSenderAddress) {
                const prepRes = await api.post('/assets/bridge/prepare', {
                    tokenAddress: candidateTokenAddress,
                    senderAddress: envSenderAddress
                });
                const senderAddress = prepRes.data?.sender;
                if (!senderAddress) {
                    throw new Error('Bridge prepare did not return CCIP sender address.');
                }

                // Real user-signed CCIP flow (MetaMask): approve sender contract + bridge call
                const sender = new ethers.Contract(senderAddress, CCIP_SENDER_ABI, signer);
                const tokenAddress = await sender.rwaToken();
                const positionTokenAddress = (bridgePosition.poolAddress || '').toLowerCase();
                const senderTokenAddress = (tokenAddress || '').toLowerCase();

                if (positionTokenAddress && senderTokenAddress !== positionTokenAddress) {
                    throw new Error(
                        `CCIP sender token mismatch. This position uses ${bridgePosition.poolAddress}, but sender is configured for ${tokenAddress}.`
                    );
                }

                const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
                const decimals = Number(await token.decimals());
                const amountWei = ethers.parseUnits(bridgeAmount, decimals);

                const bridgeTx = await sender.bridgeToFuji(bridgeReceiver, amountWei, '0x');
                const bridgeRcpt = await bridgeTx.wait();
                setBridgeHash(bridgeRcpt.hash);
            } else {
                // Fallback: backend-triggered flow
                const amountWei = ethers.parseEther(bridgeAmount).toString();
                const res = await api.post('/assets/bridge', {
                    receiver: bridgeReceiver,
                    amount: amountWei,
                    data: '0x'
                });
                const workflowResult = res.data?.workflowResult;
                setBridgeHash(typeof workflowResult === 'string' ? workflowResult : JSON.stringify(workflowResult));
            }

            setBridgeStatus('submitted');
            fetchSummary();
        } catch (e) {
            setBridgeStatus('error');
            const rawMsg = e.response?.data?.error || e.message || 'Bridge request failed';
            if (rawMsg.includes('0xe450d38c')) {
                setError('Swap failed: insufficient token balance for the CCIP sender token configuration.');
            } else {
                setError(rawMsg);
            }
        }
    };

    const setBridgeMax = () => {
        if (!bridgePosition) return;
        setBridgeAmount(ethers.formatEther(BigInt(bridgePosition.sharesRaw || '0')));
    };

    const openRedeem = (position) => {
        setRedeemPosition(position);
        setRedeemAmount('');
        setRedeemStatus('idle');
        setRedeemHash('');
        setRedeemOpen(true);
    };

    const submitRedeem = async () => {
        if (!redeemPosition) return;
        if (!redeemAmount || Number(redeemAmount) <= 0) return;

        const maxSharesWei = BigInt(redeemPosition.sharesRaw || '0');
        let requestedWei = 0n;
        try {
            requestedWei = ethers.parseEther(redeemAmount);
        } catch {
            return;
        }
        if (requestedWei > maxSharesWei) return;

        try {
            setRedeemStatus('signing');
            const signer = await BlockchainService.getSigner();
            const receiver = await signer.getAddress();
            const pool = new ethers.Contract(redeemPosition.poolAddress, POOL_ABI, signer);
            const sharesWei = ethers.parseEther(redeemAmount);

            setRedeemStatus('settling');
            const quote = await pool.previewRedeem(sharesWei);
            const tx = await pool.redeem(sharesWei, receiver);
            const rcpt = await tx.wait();
            setRedeemHash(rcpt.hash);

            setRedeemStatus('recording');
            await api.post(`/assets/redeem/${redeemPosition.poolId}`, {
                investorAddress: receiver,
                amountReturned: Number(ethers.formatUnits(quote, 6)),
                sharesBurned: Number(redeemAmount),
                txHash: rcpt.hash
            });

            setRedeemStatus('done');
            fetchSummary();
        } catch (e) {
            setRedeemStatus('error');
            setError(e.response?.data?.error || e.message || 'Redeem failed');
        }
    };

    const openTxn = async (position) => {
        if (!position?.assetId) return;
        setTxnTitle(position.assetName || 'Asset');
        setTxnOpen(true);
        setTxnLoading(true);
        setAssetTxns([]);
        try {
            const res = await api.get(`/assets/transactions/${position.assetId}`);
            setAssetTxns(res.data || []);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Failed to load asset transactions');
        } finally {
            setTxnLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight m-0">Portfolio & Wallet</h1>
                    <p className="text-slate-500 m-0 mt-2">Manage your Real World Assets and wallet balances.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => positions.length > 0 && openBridge(positions[0])}
                        className="flex items-center gap-2 px-5 h-11 rounded-full bg-primary/10 text-primary font-bold border-none cursor-pointer disabled:opacity-50"
                        disabled={positions.length === 0}
                    >
                        <span className="material-symbols-outlined">swap_horiz</span>
                        Swap
                    </button>
                    <button
                        onClick={fetchSummary}
                        className="flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-white font-bold border-none cursor-pointer shadow-lg shadow-primary/25"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Refresh
                    </button>
                </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium">{error}</div>}
            {loading && <div className="p-6 bg-white rounded-xl border text-slate-500">Loading portfolio...</div>}

            {!loading && summary && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-white rounded-xl border border-primary/10 p-7">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold m-0">Total Portfolio Value</p>
                                        <p className="text-5xl font-black tracking-tight mt-2 mb-0">${fmt(summary.totalValue)}</p>
                                    </div>
                                    <div className="bg-primary/10 rounded-lg px-3 py-1.5 text-primary font-bold text-sm">
                                        +{positions.length > 0 ? 'Live' : '0.0%'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-background-light p-4 rounded-lg border border-primary/10">
                                        <p className="text-[11px] uppercase text-slate-500 font-bold m-0">Positions</p>
                                        <p className="text-2xl font-bold m-0 mt-2">{positions.length}</p>
                                    </div>
                                    <div className="bg-background-light p-4 rounded-lg border border-primary/10">
                                        <p className="text-[11px] uppercase text-slate-500 font-bold m-0">Wallets</p>
                                        <p className="text-2xl font-bold m-0 mt-2">{summary.wallets?.length || 0}</p>
                                    </div>
                                    <div className="bg-background-light p-4 rounded-lg border border-primary/10">
                                        <p className="text-[11px] uppercase text-slate-500 font-bold m-0">Timeline Events</p>
                                        <p className="text-2xl font-bold m-0 mt-2">{timeline.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-primary/10 p-6">
                                <h3 className="text-xl font-bold mt-0 mb-4">Minted RWA Tokens</h3>
                                <div className="space-y-3">
                                    {positions.length === 0 && <p className="text-slate-500 text-sm m-0">No pool share positions yet.</p>}
                                    {positions.map((p, idx) => (
                                        <div key={`${p.poolAddress}-${idx}`} className="p-4 rounded-lg border border-primary/10 hover:bg-background-light transition-colors">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <img
                                                        src={p.assetImage || p.image || 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=300&q=80'}
                                                        alt={p.assetName}
                                                        className="w-14 h-14 rounded-lg object-cover border border-primary/20"
                                                    />
                                                    <div>
                                                        <p className="font-bold m-0">{p.assetName} ({p.assetSymbol})</p>
                                                        <p className="text-xs text-slate-500 m-0 mt-1">Wallet: {p.investorAddress}</p>
                                                        <p className="text-xs text-slate-500 m-0">Pool: {p.poolAddress}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold m-0">{fmtFromRaw(p.sharesRaw, 18)} AURAPS</p>
                                                    <p className="text-sm text-slate-500 m-0">Redeemable: {fmt(p.redeemableValue)} {p.settlementToken}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={() => openBridge(p)} className="px-3 py-1.5 rounded-lg bg-primary text-white border-none cursor-pointer text-sm font-bold">Swap (CCIP)</button>
                                                <button onClick={() => openRedeem(p)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white border-none cursor-pointer text-sm font-bold">Redeem</button>
                                                <button onClick={() => openTxn(p)} className="px-3 py-1.5 rounded-lg bg-white text-slate-900 border border-slate-300 cursor-pointer text-sm font-bold">Txn</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="bg-white rounded-xl border border-primary/10 p-6">
                                <h3 className="text-xl font-bold mt-0 mb-4">Wallet Balances</h3>
                                <div className="space-y-3">
                                    {walletBalances.length === 0 && <p className="text-slate-500 text-sm m-0">No settlement token balances loaded.</p>}
                                    {walletBalances.map((bal) => (
                                        <div key={bal.tokenAddress} className="p-4 rounded-lg border border-primary/10 bg-background-light">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold m-0">{bal.symbol}</p>
                                                <p className="text-xs text-slate-500 m-0">{bal.byWallet.length} wallet(s)</p>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                {bal.byWallet.map((w) => (
                                                    <p key={w.address} className="text-sm text-slate-600 m-0 break-all">{w.address}: {fmt(w.balance, 4)}</p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-primary/10 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold mt-0 mb-0">Recent Transactions</h3>
                                </div>
                                <div className="space-y-3">
                                    {timeline.length === 0 && <p className="text-slate-500 text-sm m-0">No timeline events yet.</p>}
                                    {timeline.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between border-b border-primary/5 pb-3">
                                            <div>
                                                <p className="font-bold m-0">{t.label}</p>
                                                <p className="text-xs text-slate-500 m-0 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass(t.status)}`}>{t.status}</span>
                                                <p className="text-xs text-slate-500 m-0 mt-1">{t.hash?.slice(0, 10)}...</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </>
            )}

            {bridgeOpen && bridgePosition && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 border border-primary/20 shadow-2xl">
                        <h3 className="m-0 text-xl font-bold">Swap via CCIP (Sepolia to Fuji)</h3>
                        <p className="text-sm text-slate-500 m-0">Position: {bridgePosition.assetName} | Max: {fmtFromRaw(bridgePosition.sharesRaw, 18)} AURAPS</p>

                        <input value={bridgeReceiver} onChange={(e) => setBridgeReceiver(e.target.value)} placeholder="Receiver address on Fuji" className="w-full p-3 border rounded-lg" />
                        <div className="flex gap-2">
                            <input
                                value={bridgeAmount}
                                onChange={(e) => setBridgeAmount(e.target.value)}
                                placeholder="Amount in AURAPS"
                                type="number"
                                className="w-full p-3 border rounded-lg"
                            />
                            <button
                                onClick={setBridgeMax}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 border border-slate-200 cursor-pointer text-sm font-bold"
                                type="button"
                            >
                                Max
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <StepPill label="Queued" state={bridgeStatus === 'idle' ? 'active' : 'done'} />
                            <StepPill label="Submitted" state={bridgeStatus === 'submitting' ? 'active' : bridgeStatus === 'submitted' ? 'done' : 'pending'} />
                            <StepPill label="Delivered/Failed" state={bridgeStatus === 'submitted' ? 'done' : bridgeStatus === 'error' ? 'error' : 'pending'} />
                        </div>
                        {bridgeHash && <p className="text-xs text-slate-500 break-all m-0">Workflow result: {bridgeHash}</p>}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setBridgeOpen(false)} className="px-4 py-2 border rounded-lg bg-white cursor-pointer">Close</button>
                            <button onClick={submitBridge} className="px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer font-bold" disabled={bridgeStatus === 'submitting'}>Submit Swap</button>
                        </div>
                    </div>
                </div>
            )}

            {redeemOpen && redeemPosition && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 border border-primary/20 shadow-2xl">
                        <h3 className="m-0 text-xl font-bold">Redeem / Settlement</h3>
                        <p className="text-sm text-slate-500 m-0">Position: {redeemPosition.assetName} | Max: {fmtFromRaw(redeemPosition.sharesRaw, 18)} AURAPS</p>
                        <input value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} placeholder="Shares to redeem" type="number" className="w-full p-3 border rounded-lg" />

                        <div className="flex flex-wrap gap-2">
                            <StepPill label="Sign Tx" state={redeemStatus === 'signing' ? 'active' : ['settling', 'recording', 'done'].includes(redeemStatus) ? 'done' : redeemStatus === 'error' ? 'error' : 'pending'} />
                            <StepPill label="On-chain Settlement" state={redeemStatus === 'settling' ? 'active' : ['recording', 'done'].includes(redeemStatus) ? 'done' : redeemStatus === 'error' ? 'error' : 'pending'} />
                            <StepPill label="Portfolio Updated" state={redeemStatus === 'recording' ? 'active' : redeemStatus === 'done' ? 'done' : redeemStatus === 'error' ? 'error' : 'pending'} />
                        </div>
                        {redeemHash && <p className="text-xs text-slate-500 m-0">Tx: {redeemHash}</p>}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setRedeemOpen(false)} className="px-4 py-2 border rounded-lg bg-white cursor-pointer">Close</button>
                            <button onClick={submitRedeem} className="px-4 py-2 rounded-lg bg-slate-900 text-white border-none cursor-pointer font-bold" disabled={['signing', 'settling', 'recording'].includes(redeemStatus)}>Redeem</button>
                        </div>
                    </div>
                </div>
            )}

            {txnOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-primary/20 shadow-2xl">
                        <h3 className="m-0 text-xl font-bold">On-chain Transactions</h3>
                        <p className="text-sm text-slate-500 m-0">Asset: {txnTitle}</p>

                        {txnLoading ? (
                            <p className="text-sm text-slate-500 m-0">Loading transactions...</p>
                        ) : (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                                {assetTxns.length === 0 && <p className="text-sm text-slate-500 m-0">No transactions found.</p>}
                                {assetTxns.map((tx) => (
                                    <div key={tx.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-sm m-0">{txLabel(tx.actionType)}</p>
                                            <p className="text-xs text-slate-500 m-0 mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass(tx.status)}`}>{tx.status}</span>
                                            {tx.txHash && (
                                                <p className="text-xs m-0 mt-1">
                                                    <a
                                                        href={`${ETHERSCAN_TX_BASE}${tx.txHash}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        View Tx
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setTxnOpen(false)} className="px-4 py-2 border rounded-lg bg-white cursor-pointer">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioWallet;
