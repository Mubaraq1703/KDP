const User = require('../models/User');
const Book = require('../models/Book');
const { sanitizeTitle, buildZipBuffer } = require('../services/archiverService');
const { uploadZipBuffer, getSignedUrl } = require('../services/cloudinaryService');
const { sendNotification } = require('../services/pushService');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * GET /api/writer/uploaders
 * Returns all active Uploader accounts for targeting.
 */
const getUploaders = async (req, res) => {
  try {
    const uploaders = await User.find(
      { role: 'UPLOADER', isActive: true },
      'name email'
    ).sort({ name: 1 });
    res.json({ uploaders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch uploaders.' });
  }
};

/**
 * POST /api/writer/books/batch
 * Processes a batch of up to 5 book submissions:
 * 1. Reads multipart fields
 * 2. Builds in-memory zip via archiver
 * 3. Uploads to Cloudinary (private)
 * 4. Saves to MongoDB
 * 5. Fires Web Push notification to target Uploader
 */
const batchUpload = async (req, res) => {
  try {
    const { books: booksJson } = req.body;

    if (!booksJson) {
      return res.status(400).json({ error: 'Book metadata (books) is required.' });
    }

    let books;
    try {
      books = JSON.parse(booksJson);
    } catch {
      return res.status(400).json({ error: 'Invalid books JSON payload.' });
    }

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ error: 'Books must be a non-empty array.' });
    }

    if (books.length > 5) {
      return res.status(400).json({ error: 'Maximum of 5 books per batch submission.' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < books.length; i++) {
      const bookMeta = books[i];
      try {
        const { title, targetUploaderId } = bookMeta;

        if (!title || !title.trim()) {
          errors.push({ index: i, error: 'Book title is required.' });
          continue;
        }

        if (!targetUploaderId) {
          errors.push({ index: i, error: 'Target uploader is required.' });
          continue;
        }

        // Verify target uploader exists and is active
        const uploader = await User.findOne({
          _id: targetUploaderId,
          role: 'UPLOADER',
          isActive: true,
        });
        if (!uploader) {
          errors.push({ index: i, error: `Target uploader not found or inactive.` });
          continue;
        }

        const sTitle = sanitizeTitle(title);

        // Gather files for this book index from multer memory storage
        const files = {};
        const filesIncluded = [];

        const fileTypes = ['docx', 'pdf', 'jpg', 'txt'];
        const suffixMap = { docx: 'ebook', pdf: 'paperback', jpg: 'cover', txt: 'metadata' };

        for (const ext of fileTypes) {
          const fieldName = `book_${i}_${ext}`;
          const fileArr = req.files?.[fieldName];
          if (fileArr && fileArr[0]) {
            const f = fileArr[0];
            files[ext] = f;
            filesIncluded.push({
              originalName: f.originalname,
              standardizedName: `${sTitle}+${suffixMap[ext]}.${ext}`,
              fileType: ext,
              sizeInBytes: f.size,
            });
          }
        }

        // Build zip in memory
        const zipBuffer = await buildZipBuffer(sTitle, files);

        // Upload to Cloudinary as private raw resource
        const publicId = `bookflow/${sTitle}_${Date.now()}`;
        const cloudResult = await uploadZipBuffer(zipBuffer, publicId);

        // Save book record in MongoDB
        const book = await Book.create({
          title: title.trim(),
          sanitizedTitle: sTitle,
          writerId: req.user.id,
          targetUploaderId,
          cloudinaryPublicId: cloudResult.public_id,
          status: 'NEW',
          filesIncluded,
        });

        // Populate writer details for real-time frontend consumption
        const populatedBook = await Book.findById(book._id).populate('writerId', 'name email');

        // Fire real-time Socket.io update to target uploader
        const io = req.app.get('io');
        if (io) {
          io.to(`uploader_${targetUploaderId}`).emit('book:assigned', {
            book: populatedBook ? populatedBook.toObject() : book.toObject(),
          });
        }

        // Fire Web Push notification to Uploader (non-blocking)
        if (uploader.pushSubscription) {
          sendNotification(uploader.pushSubscription, {
            title: 'New Book Uploaded',
            body: `"${title.trim()}" has been assigned to you.`,
            data: { bookId: book._id.toString() },
          }).catch((err) => console.warn('[Push] Notification failed:', err.message));
        }

        results.push({ index: i, book: populatedBook ? populatedBook.toObject() : book.toObject() });
      } catch (bookErr) {
        console.error(`[Writer] Book ${i} upload error:`, bookErr.message);
        errors.push({ index: i, error: bookErr.message });
      }
    }

    res.status(201).json({
      message: `${results.length} book(s) uploaded successfully.`,
      results,
      errors,
    });
  } catch (err) {
    console.error('[Writer] Batch upload error:', err.message);
    res.status(500).json({ error: 'Batch upload failed. Please try again.' });
  }
};

/**
 * GET /api/writer/books
 * Returns writer's books filtered by tab and optional search query.
 * Query params: tab=NEW|DOWNLOADED, search=string
 */
const getBooks = async (req, res) => {
  try {
    const { tab = 'NEW', search = '' } = req.query;
    const status = tab === 'DOWNLOADED' ? 'DOWNLOADED' : 'NEW';

    const query = {
      writerId: req.user.id,
      status,
    };

    if (search.trim()) {
      query.$text = { $search: search.trim() };
    }

    const books = await Book.find(query)
      .populate('targetUploaderId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
};

/**
 * GET /api/writer/books/:id/download
 * Server-side proxy stream — fetches from Cloudinary and pipes to response.
 * Cloudinary URLs are never exposed to the client.
 */
const downloadBook = async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, writerId: req.user.id });
    if (!book) return res.status(404).json({ error: 'Book not found.' });

    const signedUrl = getSignedUrl(book.cloudinaryPublicId, 120);
    const filename = `${book.sanitizedTitle}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');

    // Determine protocol and proxy the stream
    const urlObj = new URL(signedUrl);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    protocol.get(signedUrl, (cloudRes) => {
      if (cloudRes.statusCode !== 200) {
        return res.status(502).json({ error: 'Failed to fetch asset from storage.' });
      }
      cloudRes.pipe(res);
    }).on('error', (err) => {
      console.error('[Writer Download] Proxy error:', err.message);
      res.status(502).json({ error: 'Download proxy failed.' });
    });
  } catch (err) {
    console.error('[Writer Download] Error:', err.message);
    res.status(500).json({ error: 'Download failed.' });
  }
};

module.exports = { getUploaders, batchUpload, getBooks, downloadBook };
