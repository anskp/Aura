const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/kyc/submit', protect, userController.submitKYC);
router.get('/admin/users', protect, userController.getUsers);
router.post('/admin/kyc/approve', protect, userController.approveKYC);

module.exports = router;
