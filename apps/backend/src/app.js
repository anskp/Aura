const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const userRoutes = require('./routes/user.routes');
const assetRoutes = require('./routes/asset.routes');
const kycRoutes = require('./routes/kyc.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const portfolioRoutes = require('./routes/portfolio.routes');
const aiRoutes = require('./routes/ai.routes');
const p2pRoutes = require('./routes/p2p.routes');

const app = express();

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    const oldJson = res.json;
    res.json = function (data) {
        if (res.statusCode >= 400) {
            console.error(`Response ${res.statusCode}:`, data);
        }
        return oldJson.call(this, data);
    };
    next();
});

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/wallets', walletRoutes);
app.use('/users', userRoutes);
app.use('/assets', assetRoutes);
app.use('/kyc', kycRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/ai', aiRoutes);
app.use('/p2p', p2pRoutes);

module.exports = app;
