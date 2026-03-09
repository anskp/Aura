const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const portfolioController = require('../controllers/portfolio.controller');

router.get('/summary', protect, portfolioController.getSummary);

module.exports = router;
