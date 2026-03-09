import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import api from '../../services/api';
import { BlockchainService } from '../../services/blockchain.service';

const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

const P2PMarket = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [orders, setOrders] = useState([]);
    const [myOrders, setMyOrders] = useState({ sellOrders: [], buyTrades: [] });
    const [wallets, setWallets] = useState([]);
    const [positions, setPositions] = useState([]);
    const [mode, setMode] = useState('BUY');
    const [createForm, setCreateForm] = useState({ poolId: '', sharesAmount: '', pricePerShare: '' });
    const [activeWallet, setActiveWallet] = useState('');
    const [operatorAddress, setOperatorAddress] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [ordersRes, myRes, portfolioRes, walletsRes] = await Promise.all([
                api.get('/p2p/orders'),
                api.get('/p2p/my'),
                api.get('/portfolio/summary'),
                api.get('/wallets')
            ]);
            const cfgRes = await api.get('/p2p/config');
            setOrders(ordersRes.data || []);
            setMyOrders(myRes.data || { sellOrders: [], buyTrades: [] });
            setPositions(portfolioRes.data?.positions || []);
            setOperatorAddress(cfgRes.data?.operatorAddress || '');
            const ws = walletsRes.data || [];
            setWallets(ws);
            if (ws.length && !activeWallet) {
                setActiveWallet(ws[0].address);
            }
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Failed to load P2P market');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const sellablePositions = useMemo(
        () => positions.filter((p) => Number(p.sharesRaw || 0) > 0),
        [positions]
    );

    const selectablePools = useMemo(() => {
        const map = new Map();
        for (const p of sellablePositions) {
            if (!map.has(p.poolId)) {
                map.set(p.poolId, p);
            }
        }
        return Array.from(map.values());
    }, [sellablePositions]);

    const openOrders = useMemo(
        () => orders.filter((o) => ['OPEN', 'PARTIAL'].includes(o.status)),
        [orders]
    );

    const handleCreateOrder = async () => {
        try {
            setError('');
            const pos = selectablePools.find((p) => Number(p.poolId) === Number(createForm.poolId));
            if (!pos) throw new Error('Select a valid position');
            if (!operatorAddress) throw new Error('P2P operator is not configured');

            const signer = await BlockchainService.getSigner();
            const signerAddress = await signer.getAddress();
            if (signerAddress.toLowerCase() !== activeWallet.toLowerCase()) {
                throw new Error('Selected execution wallet must match connected wallet');
            }

            const token = new ethers.Contract(pos.poolAddress, ERC20_ABI, signer);
            const decimals = Number(await token.decimals());
            const required = ethers.parseUnits(String(createForm.sharesAmount), decimals);
            const allowance = await token.allowance(activeWallet, operatorAddress);
            if (allowance < required) {
                const approveTx = await token.approve(operatorAddress, ethers.MaxUint256);
                await approveTx.wait();
            }

            await api.post('/p2p/orders', {
                poolId: Number(createForm.poolId),
                sellerAddress: activeWallet,
                sharesAmount: Number(createForm.sharesAmount),
                pricePerShare: Number(createForm.pricePerShare)
            });
            setCreateForm({ poolId: '', sharesAmount: '', pricePerShare: '' });
            await load();
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Failed to create order');
        }
    };

    const handleFillOrder = async (order) => {
        try {
            setError('');
            if (!operatorAddress) throw new Error('P2P operator is not configured');

            const signer = await BlockchainService.getSigner();
            const signerAddress = await signer.getAddress();
            if (signerAddress.toLowerCase() !== activeWallet.toLowerCase()) {
                throw new Error('Selected execution wallet must match connected wallet');
            }

            const stable = new ethers.Contract(order.stablecoinAddress, ERC20_ABI, signer);
            const stableDecimals = Number(await stable.decimals());
            const shareDecimals = 18;
            const sharesRaw = ethers.parseUnits(String(order.sharesAvailable), shareDecimals);
            const priceRaw = ethers.parseUnits(String(order.pricePerShare), stableDecimals);
            const totalRaw = (sharesRaw * priceRaw) / (10n ** BigInt(shareDecimals));
            const allowance = await stable.allowance(activeWallet, operatorAddress);
            if (allowance < totalRaw) {
                const approveTx = await stable.approve(operatorAddress, ethers.MaxUint256);
                await approveTx.wait();
            }

            await api.post('/p2p/orders/fill', {
                orderId: order.id,
                buyerAddress: activeWallet,
                sharesAmount: Number(order.sharesAvailable)
            });
            await load();
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Failed to fill order');
        }
    };

    const handleCancelOrder = async (orderId) => {
        try {
            setError('');
            await api.post(`/p2p/orders/${orderId}/cancel`);
            await load();
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Failed to cancel order');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4 items-center">
                <div>
                    <h1 className="text-3xl font-bold m-0">P2P Market</h1>
                    <p className="text-slate-500 m-0 mt-2">Post peer-to-peer buy/sell offers for tokenized assets.</p>
                </div>
                <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
                    <button
                        type="button"
                        onClick={() => setMode('BUY')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer ${mode === 'BUY' ? 'bg-primary text-white' : 'text-slate-500 bg-transparent'}`}
                    >
                        Buy Orders
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('SELL')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer ${mode === 'SELL' ? 'bg-primary text-white' : 'text-slate-500 bg-transparent'}`}
                    >
                        Sell Orders
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div>
                    <p className="m-0 text-sm font-bold">Execution Wallet</p>
                    <p className="m-0 text-xs text-slate-500">Only your connected + verified wallet can list/buy in P2P.</p>
                </div>
                <select
                    value={activeWallet}
                    onChange={(e) => setActiveWallet(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                    {wallets.map((w) => (
                        <option key={`${w.address}-${w.chain}`} value={w.address}>
                            {w.address} ({w.chain})
                        </option>
                    ))}
                </select>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium">{error}</div>}
            {loading && <div className="bg-white border rounded-xl p-6 text-slate-500">Loading P2P market...</div>}

            {!loading && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
                        <h3 className="text-lg font-bold mt-0 mb-4">{mode === 'BUY' ? 'Open Sell Orders (You Buy)' : 'My Active Sell Orders'}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs uppercase tracking-wider text-slate-500">
                                        <th className="pb-3">Asset</th>
                                        <th className="pb-3">Maker</th>
                                        <th className="pb-3">Price (USDC)</th>
                                        <th className="pb-3">Amount</th>
                                        <th className="pb-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(mode === 'BUY' ? openOrders : (myOrders.sellOrders || []).filter((o) => ['OPEN', 'PARTIAL'].includes(o.status)))
                                        .map((o) => (
                                            <tr key={o.id}>
                                                <td className="py-3">
                                                    <p className="font-bold m-0">{o.assetName}</p>
                                                    <p className="text-xs text-slate-500 m-0">{o.assetSymbol}</p>
                                                </td>
                                                <td className="py-3 text-sm text-slate-600">{mode === 'BUY' ? o.sellerAddress : activeWallet}</td>
                                                <td className="py-3 font-bold">{o.pricePerShare}</td>
                                                <td className="py-3">{mode === 'BUY' ? o.sharesAvailable : (o.sharesAmount - o.sharesFilled)}</td>
                                                <td className="py-3 text-right">
                                                    {mode === 'BUY' ? (
                                                        <button
                                                            onClick={() => handleFillOrder(o)}
                                                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold border-none cursor-pointer"
                                                            disabled={!activeWallet}
                                                        >
                                                            Buy From
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCancelOrder(o.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold border-none cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    {(mode === 'BUY' ? openOrders : (myOrders.sellOrders || []).filter((o) => ['OPEN', 'PARTIAL'].includes(o.status))).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-sm text-slate-500">No orders available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
                        <h3 className="text-lg font-bold mt-0 mb-4">Create My Sell Offer</h3>
                        {sellablePositions.length === 0 ? (
                            <p className="text-sm text-slate-500 m-0">No token position available to sell yet. Buy from marketplace first.</p>
                        ) : (
                            <div className="space-y-3">
                                <select
                                    value={createForm.poolId}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, poolId: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Select Position</option>
                                    {selectablePools.map((p) => (
                                        <option key={p.poolId} value={p.poolId}>
                                            {p.assetName} ({p.assetSymbol}) - balance {p.sharesRaw}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={createForm.sharesAmount}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, sharesAmount: e.target.value }))}
                                    placeholder="Shares amount"
                                    type="number"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                />
                                <input
                                    value={createForm.pricePerShare}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, pricePerShare: e.target.value }))}
                                    placeholder="Price per share (USDC)"
                                    type="number"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                />
                                <button
                                    onClick={handleCreateOrder}
                                    className="w-full px-3 py-2 rounded-lg bg-primary text-white text-sm font-bold border-none cursor-pointer"
                                    disabled={!activeWallet || !createForm.poolId || !createForm.sharesAmount || !createForm.pricePerShare}
                                >
                                    Create Offer
                                </button>
                            </div>
                        )}
                        <div className="mt-6">
                            <h4 className="text-sm font-bold mt-0 mb-2">My Sell Orders</h4>
                            <div className="space-y-2">
                                {(myOrders.sellOrders || []).slice(0, 6).map((o) => (
                                    <div key={o.id} className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-sm font-bold m-0">{o.assetName}</p>
                                        <p className="text-xs text-slate-500 m-0 mt-1">Shares: {o.sharesAmount} | Filled: {o.sharesFilled}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[11px] font-bold text-slate-600">{o.status}</span>
                                            {['OPEN', 'PARTIAL'].includes(o.status) && (
                                                <button
                                                    onClick={() => handleCancelOrder(o.id)}
                                                    className="px-2 py-1 rounded bg-slate-900 text-white text-xs border-none cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(myOrders.sellOrders || []).length === 0 && (
                                    <p className="text-xs text-slate-500 m-0">No sell orders yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default P2PMarket;
