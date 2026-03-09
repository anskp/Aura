const { ethers } = require('ethers');
const prisma = require('../config/prisma');
const blockchainService = require('./blockchain.service');
const portfolioService = require('./portfolio.service');

const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

const toNumber = (v, fallback = 0) => {
    try {
        return Number(v);
    } catch {
        return fallback;
    }
};

const normalizeAddress = (a) => (a || '').toLowerCase();

const assertApprovedKyc = (user) => {
    if (!user || user.kycStatus !== 'APPROVED') {
        throw new Error('Only KYC-approved users can use P2P market');
    }
};

const assertWalletOwnedByUser = (user, walletAddress) => {
    const target = normalizeAddress(walletAddress);
    const owned = (user.wallets || []).some((w) => normalizeAddress(w.address) === target);
    if (!owned) {
        throw new Error('Wallet is not connected to your account');
    }
};

const assertWalletVerifiedOnChain = async (walletAddress) => {
    const verified = await blockchainService.isVerified(walletAddress);
    if (!verified) {
        throw new Error('Wallet must be identity-verified on-chain for P2P');
    }
};

const getOperatorAddress = () => blockchainService.wallet.address;

const parseTokenAmount = (value, decimals) => ethers.parseUnits(String(value), decimals);

const getTokenMeta = async (tokenAddress) => {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, blockchainService.provider);
    const decimals = Number(await token.decimals());
    return { token, decimals };
};

const getOpenReservedSharesRaw = async (sellerId, poolId, tokenDecimals) => {
    const openOrders = await prisma.p2p_order.findMany({
        where: {
            sellerId,
            poolId,
            status: { in: ['OPEN', 'PARTIAL'] }
        },
        select: {
            sharesAmount: true,
            sharesFilled: true
        }
    });

    let reserved = 0n;
    for (const o of openOrders) {
        const amountRaw = parseTokenAmount(o.sharesAmount.toString(), tokenDecimals);
        const filledRaw = parseTokenAmount(o.sharesFilled.toString(), tokenDecimals);
        const remaining = amountRaw > filledRaw ? amountRaw - filledRaw : 0n;
        reserved += remaining;
    }
    return reserved;
};

const getConfig = async () => {
    return {
        operatorAddress: getOperatorAddress(),
        network: 'SEPOLIA',
        note: 'Seller must approve pool share token to operator before listing. Buyer must approve settlement token before fill.'
    };
};

const getOrderBook = async () => {
    const orders = await prisma.p2p_order.findMany({
        where: { status: { in: ['OPEN', 'PARTIAL'] } },
        include: {
            pool: { include: { asset: true } },
            seller: { select: { id: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return orders.map((o) => {
        const sharesAmount = toNumber(o.sharesAmount);
        const sharesFilled = toNumber(o.sharesFilled);
        const sharesAvailable = Math.max(0, sharesAmount - sharesFilled);
        const pricePerShare = toNumber(o.pricePerShare);
        return {
            id: o.id,
            poolId: o.poolId,
            assetId: o.pool?.assetId,
            assetName: o.pool?.asset?.name,
            assetSymbol: o.pool?.asset?.symbol,
            poolAddress: o.pool?.address,
            stablecoinAddress: o.pool?.stablecoinAddress,
            sellerId: o.sellerId,
            sellerAddress: o.sellerAddress,
            seller: o.seller,
            pricePerShare,
            sharesAmount,
            sharesFilled,
            sharesAvailable,
            notionalAvailable: sharesAvailable * pricePerShare,
            status: o.status,
            createdAt: o.createdAt
        };
    });
};

const createSellOrder = async (user, payload) => {
    assertApprovedKyc(user);
    const { poolId, sellerAddress, sharesAmount, pricePerShare } = payload;
    const poolIdNum = Number(poolId);
    const shares = Number(sharesAmount);
    const price = Number(pricePerShare);

    if (!poolIdNum || shares <= 0 || price <= 0) {
        throw new Error('poolId, sharesAmount, and pricePerShare must be valid positive numbers');
    }
    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
        throw new Error('Valid sellerAddress is required');
    }

    assertWalletOwnedByUser(user, sellerAddress);
    await assertWalletVerifiedOnChain(sellerAddress);

    const pool = await prisma.pool.findUnique({
        where: { id: poolIdNum },
        include: { asset: true }
    });
    if (!pool || pool.status !== 'ACTIVE') {
        throw new Error('Pool is not active');
    }

    // Seller can list only if they currently hold enough pool shares.
    const summary = await portfolioService.getPortfolioSummary(user.id);
    const position = (summary.positions || []).find(
        (p) => Number(p.poolId) === poolIdNum && normalizeAddress(p.investorAddress) === normalizeAddress(sellerAddress)
    );
    if (!position) {
        throw new Error('No position found for this pool on selected wallet');
    }

    const { token, decimals: tokenDecimals } = await getTokenMeta(pool.address);
    const requestedRaw = parseTokenAmount(shares.toString(), tokenDecimals);
    const ownedRaw = BigInt(position.sharesRaw || '0');
    if (requestedRaw > ownedRaw) {
        throw new Error('Insufficient token balance to create this sell order');
    }

    // Prevent overselling across multiple open orders.
    const reservedRaw = await getOpenReservedSharesRaw(user.id, poolIdNum, tokenDecimals);
    if (requestedRaw + reservedRaw > ownedRaw) {
        throw new Error('Insufficient unreserved token balance for this new order');
    }

    const operator = getOperatorAddress();
    const [allowanceRaw, onchainBalanceRaw] = await Promise.all([
        token.allowance(sellerAddress, operator),
        token.balanceOf(sellerAddress)
    ]);
    if (onchainBalanceRaw < requestedRaw) {
        throw new Error('On-chain token balance is insufficient for this listing');
    }
    if (allowanceRaw < requestedRaw + reservedRaw) {
        throw new Error(`Approve pool token to operator ${operator} before listing (insufficient allowance)`);
    }

    return prisma.p2p_order.create({
        data: {
            poolId: poolIdNum,
            sellerId: user.id,
            sellerAddress: normalizeAddress(sellerAddress),
            pricePerShare: price,
            sharesAmount: shares
        }
    });
};

const fillOrder = async (user, payload) => {
    assertApprovedKyc(user);
    const { orderId, buyerAddress, sharesAmount } = payload;
    const orderIdNum = Number(orderId);
    const shares = Number(sharesAmount);

    if (!orderIdNum || shares <= 0) {
        throw new Error('orderId and sharesAmount must be valid positive numbers');
    }
    if (!buyerAddress || !ethers.isAddress(buyerAddress)) {
        throw new Error('Valid buyerAddress is required');
    }

    assertWalletOwnedByUser(user, buyerAddress);
    await assertWalletVerifiedOnChain(buyerAddress);

    const order = await prisma.p2p_order.findUnique({
        where: { id: orderIdNum },
        include: {
            pool: { include: { asset: true } },
            seller: true
        }
    });
    if (!order) throw new Error('Order not found');
    if (!['OPEN', 'PARTIAL'].includes(order.status)) {
        throw new Error('Order is not fillable');
    }
    if (order.sellerId === user.id) {
        throw new Error('You cannot fill your own order');
    }

    const remaining = toNumber(order.sharesAmount) - toNumber(order.sharesFilled);
    if (shares > remaining) {
        throw new Error(`Requested shares exceed available amount (${remaining})`);
    }

    // Buyer must have enough settlement token balance in selected wallet.
    const summary = await portfolioService.getPortfolioSummary(user.id);
    const stablecoinAddress = normalizeAddress(order.pool?.stablecoinAddress);
    const stableBalEntry = (summary.walletBalances || []).find(
        (b) => normalizeAddress(b.tokenAddress) === stablecoinAddress
    );
    const walletBal = stableBalEntry?.byWallet?.find(
        (w) => normalizeAddress(w.address) === normalizeAddress(buyerAddress)
    );
    const buyerBalance = Number(walletBal?.balance || 0);
    const totalPrice = shares * toNumber(order.pricePerShare);
    if (buyerBalance < totalPrice) {
        throw new Error('Insufficient settlement token balance to fill order');
    }

    const operator = getOperatorAddress();
    const { token: shareToken, decimals: shareDecimals } = await getTokenMeta(order.pool.address);
    const { token: stableToken, decimals: stableDecimals } = await getTokenMeta(order.pool.stablecoinAddress);

    const sharesRaw = parseTokenAmount(shares.toString(), shareDecimals);
    const pricePerShareRaw = parseTokenAmount(order.pricePerShare.toString(), stableDecimals);
    const stableUnit = 10n ** BigInt(shareDecimals);
    const totalPriceRaw = (sharesRaw * pricePerShareRaw) / stableUnit;

    const [sellerShareBal, sellerShareAllowance, buyerStableBal, buyerStableAllowance] = await Promise.all([
        shareToken.balanceOf(order.sellerAddress),
        shareToken.allowance(order.sellerAddress, operator),
        stableToken.balanceOf(buyerAddress),
        stableToken.allowance(buyerAddress, operator)
    ]);

    if (sellerShareBal < sharesRaw) {
        throw new Error('Seller no longer has enough token balance to settle this order');
    }
    if (sellerShareAllowance < sharesRaw) {
        throw new Error(`Seller allowance to operator ${operator} is insufficient`);
    }
    if (buyerStableBal < totalPriceRaw) {
        throw new Error('Buyer on-chain settlement token balance is insufficient');
    }
    if (buyerStableAllowance < totalPriceRaw) {
        throw new Error(`Approve settlement token to operator ${operator} before buying`);
    }

    const nextFilled = toNumber(order.sharesFilled) + shares;
    const nextStatus = nextFilled >= toNumber(order.sharesAmount) ? 'FILLED' : 'PARTIAL';

    // Execute on-chain settlement through operator wallet using allowances.
    const stableTx = await stableToken.connect(blockchainService.wallet).transferFrom(
        buyerAddress,
        order.sellerAddress,
        totalPriceRaw
    );
    const stableRcpt = await stableTx.wait();

    const shareTx = await shareToken.connect(blockchainService.wallet).transferFrom(
        order.sellerAddress,
        buyerAddress,
        sharesRaw
    );
    const shareRcpt = await shareTx.wait();

    return prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.p2p_order.update({
            where: { id: orderIdNum },
            data: {
                sharesFilled: nextFilled,
                status: nextStatus
            }
        });

        const trade = await tx.p2p_trade.create({
            data: {
                orderId: orderIdNum,
                buyerId: user.id,
                buyerAddress: normalizeAddress(buyerAddress),
                sharesAmount: shares,
                totalPrice,
                status: 'MATCHED'
            }
        });

        return {
            order: updatedOrder,
            trade,
            settlement: {
                stableTransferTxHash: stableRcpt.hash,
                shareTransferTxHash: shareRcpt.hash
            }
        };
    });
};

const cancelOrder = async (user, orderId) => {
    const orderIdNum = Number(orderId);
    if (!orderIdNum) throw new Error('Invalid order id');

    const order = await prisma.p2p_order.findUnique({ where: { id: orderIdNum } });
    if (!order) throw new Error('Order not found');
    if (order.sellerId !== user.id) throw new Error('You can only cancel your own order');
    if (!['OPEN', 'PARTIAL'].includes(order.status)) throw new Error('Order cannot be cancelled');

    return prisma.p2p_order.update({
        where: { id: orderIdNum },
        data: { status: 'CANCELLED' }
    });
};

const getMyOrders = async (userId) => {
    const [sellOrders, buyTrades] = await Promise.all([
        prisma.p2p_order.findMany({
            where: { sellerId: userId },
            include: { pool: { include: { asset: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.p2p_trade.findMany({
            where: { buyerId: userId },
            include: { order: { include: { pool: { include: { asset: true } } } } },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    return {
        sellOrders: sellOrders.map((o) => ({
            id: o.id,
            poolId: o.poolId,
            assetName: o.pool?.asset?.name,
            assetSymbol: o.pool?.asset?.symbol,
            sellerAddress: o.sellerAddress,
            pricePerShare: toNumber(o.pricePerShare),
            sharesAmount: toNumber(o.sharesAmount),
            sharesFilled: toNumber(o.sharesFilled),
            status: o.status,
            createdAt: o.createdAt
        })),
        buyTrades: buyTrades.map((t) => ({
            id: t.id,
            orderId: t.orderId,
            assetName: t.order?.pool?.asset?.name,
            assetSymbol: t.order?.pool?.asset?.symbol,
            buyerAddress: t.buyerAddress,
            sharesAmount: toNumber(t.sharesAmount),
            totalPrice: toNumber(t.totalPrice),
            status: t.status,
            createdAt: t.createdAt
        }))
    };
};

module.exports = {
    getConfig,
    getOrderBook,
    createSellOrder,
    fillOrder,
    cancelOrder,
    getMyOrders
};
