const express = require('express');
const router = express.Router();
const { login, logout, getMe, getVapidPublicKey } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.get('/vapid-public-key', getVapidPublicKey);

module.exports = router;
