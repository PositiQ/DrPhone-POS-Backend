const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/remember', authController.remember);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
