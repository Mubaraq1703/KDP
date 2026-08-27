const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { upload, buildFields } = require('../middleware/upload');
const { getUploaders, batchUpload, getBooks, downloadBook } = require('../controllers/writerController');

// All writer routes require WRITER role
router.use(authenticate, authorize('WRITER'));

router.get('/uploaders', getUploaders);
router.post('/books/batch', upload.fields(buildFields()), batchUpload);
router.get('/books', getBooks);
router.get('/books/:id/download', downloadBook);

module.exports = router;
