const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getUsers, createUser, updateUser, getStats } = require('../controllers/adminController');

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.get('/stats', getStats);

module.exports = router;
