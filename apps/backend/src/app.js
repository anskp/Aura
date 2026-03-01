const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const userRoutes = require('./routes/user.routes');
const assetRoutes = require('./routes/asset.routes');

const app = express();

app.use(cors());
app.use(express.json());

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

module.exports = app;
