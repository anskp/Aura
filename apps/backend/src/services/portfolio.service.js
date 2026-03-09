const { ethers } = require('ethers');
const prisma = require('../config/prisma');

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

const POOL_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function previewRedeem(uint256 shares) view returns (uint256)"
];

const toNumber = (value, fallback = 0) => {
    try {
        return Number(value);
    } catch {
        return fallback;
    }
};

const getPortfolioSummary = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallets: true }
    });

    if (!user) throw new Error("User not found");

    // Deduplicate by wallet address so UI doesn't over-count the same wallet across chain rows.
    const uniqueWalletMap = new Map();
    for (const w of user.wallets) {
        const key = w.address.toLowerCase();
        if (!uniqueWalletMap.has(key)) {
            uniqueWalletMap.set(key, w);
        }
    }

    const uniqueWallets = Array.from(uniqueWalletMap.values());
    const walletAddresses = uniqueWallets.map((w) => w.address.toLowerCase());

    const pools = await prisma.pool.findMany({
        where: { status: 'ACTIVE' },
        include: {
            asset: true
        }
    });

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const positions = [];
    let totalValue = 0;

    for (const pool of pools) {
        const poolContract = new ethers.Contract(pool.address, POOL_ABI, provider);
        const stablecoinAddress = pool.stablecoinAddress;
        const stablecoin = new ethers.Contract(stablecoinAddress, ERC20_ABI, provider);

        let stablecoinDecimals = 6;
        let stablecoinSymbol = 'USDC';
        try {
            stablecoinDecimals = Number(await stablecoin.decimals());
            stablecoinSymbol = await stablecoin.symbol();
        } catch {
            // Fallbacks above are acceptable for test tokens.
        }

        for (const walletAddress of walletAddresses) {
            try {
                const sharesRaw = await poolContract.balanceOf(walletAddress);
                if (sharesRaw === 0n) continue;

                const shares = Number(ethers.formatEther(sharesRaw));

                let redeemable = null;
                try {
                    const redeemableRaw = await poolContract.previewRedeem(sharesRaw);
                    redeemable = Number(ethers.formatUnits(redeemableRaw, stablecoinDecimals));
                    totalValue += redeemable;
                } catch (error) {
                    // Pool can be paused/stale; still return share balances in portfolio.
                    console.warn(
                        `[Portfolio Service] Quote unavailable for pool=${pool.id}, wallet=${walletAddress}: ${error.message}`
                    );
                }

                positions.push({
                    poolId: pool.id,
                    poolAddress: pool.address,
                    assetId: pool.assetId,
                    assetName: pool.asset?.name || `Asset ${pool.assetId}`,
                    assetSymbol: pool.asset?.symbol || 'AURA',
                    investorAddress: walletAddress,
                    shares,
                    sharesRaw: sharesRaw.toString(),
                    redeemableValue: redeemable,
                    settlementToken: stablecoinSymbol,
                    nav: toNumber(pool.asset?.nav, toNumber(pool.asset?.valuation, 0)),
                    tokenType: 'AURAPS'
                });
            } catch (error) {
                console.warn(`[Portfolio Service] Failed reading position for pool=${pool.id}, wallet=${walletAddress}: ${error.message}`);
            }
        }
    }

    const walletBalancesMap = new Map();
    for (const pool of pools) {
        const stablecoinAddress = pool.stablecoinAddress.toLowerCase();
        if (walletBalancesMap.has(stablecoinAddress)) continue;

        const stablecoin = new ethers.Contract(pool.stablecoinAddress, ERC20_ABI, provider);
        let decimals = 6;
        let symbol = 'USDC';
        try {
            decimals = Number(await stablecoin.decimals());
            symbol = await stablecoin.symbol();
        } catch {
            // Fallbacks above are acceptable for test tokens.
        }

        const byWallet = [];
        for (const walletAddress of walletAddresses) {
            try {
                const bal = await stablecoin.balanceOf(walletAddress);
                byWallet.push({
                    address: walletAddress,
                    balance: Number(ethers.formatUnits(bal, decimals))
                });
            } catch {
                byWallet.push({
                    address: walletAddress,
                    balance: 0
                });
            }
        }

        walletBalancesMap.set(stablecoinAddress, {
            tokenAddress: pool.stablecoinAddress,
            symbol,
            decimals,
            byWallet
        });
    }

    const recentTransactions = await prisma.transaction.findMany({
        where: {
            OR: walletAddresses.map((address) => ({ userAddress: address }))
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    return {
        wallets: uniqueWallets,
        totalValue,
        positions,
        walletBalances: Array.from(walletBalancesMap.values()),
        recentTransactions
    };
};

module.exports = {
    getPortfolioSummary
};
