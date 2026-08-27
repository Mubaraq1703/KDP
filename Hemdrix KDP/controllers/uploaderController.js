const Book = require('../models/Book');
const { getSignedUrl } = require('../services/cloudinaryService');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * GET /api/uploader/books
 * Returns books targeted at the authenticated Uploader,
 * filtered by tab (NEW or DOWNLOADED).
 */
const getBooks = async (req, res) => {
  try {
    const { tab = 'NEW', search = '' } = req.query;
    const status = tab === 'DOWNLOADED' ? 'DOWNLOADED' : 'NEW';

    const query = {
      targetUploaderId: req.user.id,
      status,
    };

    if (search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: new RegExp(safeSearch, 'i') };
    }

    const books = await Book.find(query)
      .populate('writerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
};

/**
 * GET /api/uploader/books/:id/download
 * Server-side proxy stream for Uploader downloads.
 * Side effects:
 *   1. Records downloadedAt timestamp
 *   2. Sets status to 'DOWNLOADED'
 *   3. Emits 'book:downloaded' Socket.io event to the Writer's room
 */
const downloadBook = async (req, res) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
      targetUploaderId: req.user.id,
    });

    if (!book) return res.status(404).json({ error: 'Book not found or access denied.' });

    const signedUrl = getSignedUrl(book.cloudinaryPublicId, 120);
    const filename = `${book.sanitizedTitle}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');

    // Determine protocol and proxy the stream
    const urlObj = new URL(signedUrl);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const proxyReq = protocol.get(signedUrl, (cloudRes) => {
      if (cloudRes.statusCode !== 200) {
        return res.status(502).json({ error: 'Failed to fetch asset from storage.' });
      }

      // Pipe the asset to the client
      cloudRes.pipe(res);

      // After streaming completes, record the download event
      cloudRes.on('end', async () => {
        try {
          const now = new Date();
          
          // Only update timestamp on FIRST download
          const updateData = { status: 'DOWNLOADED' };
          if (!book.downloadedAt) {
            updateData.downloadedAt = now;
          }

          await Book.findByIdAndUpdate(book._id, updateData);

          // Emit real-time event to the Writer's dedicated Socket.io room
          const io = req.app.get('io');
          if (io) {
            io.to(`writer_${book.writerId.toString()}`).emit('book:downloaded', {
              bookId: book._id.toString(),
              downloadedAt: (book.downloadedAt || now).toISOString(),
              status: 'DOWNLOADED',
            });
          }
        } catch (updateErr) {
          console.error('[Uploader Download] Status update error:', updateErr.message);
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[Uploader Download] Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Download proxy failed.' });
      }
    });
  } catch (err) {
    console.error('[Uploader Download] Error:', err.message);
    res.status(500).json({ error: 'Download failed.' });
  }
};

module.exports = { getBooks, downloadBook };
