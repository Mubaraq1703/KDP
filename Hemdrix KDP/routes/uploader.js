const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getBooks, downloadBook } = require('../controllers/uploaderController');

// All uploader routes require UPLOADER role
router.use(authenticate, authorize('UPLOADER'));

router.get('/books', getBooks);
router.get('/books/:id/download', downloadBook);

module.exports = router;
