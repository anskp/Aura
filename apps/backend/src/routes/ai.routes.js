const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const aiController = require('../controllers/ai.controller');

router.post('/chat', protect, aiController.chat);

module.exports = router;

