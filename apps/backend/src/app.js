const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const userRoutes = require('./routes/user.routes');
const kycRoutes = require('./routes/kyc.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');

const app = express();

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/wallets', walletRoutes);
app.use('/users', userRoutes);
app.use('/kyc', kycRoutes);
app.use('/marketplace', marketplaceRoutes);

module.exports = app;
