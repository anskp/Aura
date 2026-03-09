const portfolioService = require('../services/portfolio.service');

const getSummary = async (req, res) => {
    try {
        const summary = await portfolioService.getPortfolioSummary(req.user.id);
        res.status(200).json(summary);
    } catch (error) {
        console.error(`[API Error] getSummary: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getSummary
};
