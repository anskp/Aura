require('dotenv').config();
const app = require('./app');
const { startOracleScheduler } = require('./services/oracle.scheduler');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startOracleScheduler();
});
