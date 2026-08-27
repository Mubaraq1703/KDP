const archiver = require('archiver');
const { PassThrough } = require('stream');

/**
 * Sanitizes a book title for use in filenames.
 * Strips special characters, replaces spaces with underscores.
 * @param {string} title
 * @returns {string}
 */
const sanitizeTitle = (title) => {
  return title
    .trim()
    .replace(/[^\w\s-]/g, '')   // Remove special chars except dash
    .replace(/\s+/g, '_')        // Replace spaces with underscores
    .replace(/-+/g, '_')         // Replace dashes with underscores
    .toLowerCase()
    .substring(0, 80);           // Max 80 chars
};

/**
 * Builds a zip archive in memory from the provided file buffers.
 * Files are renamed to the standardized BookFlow naming convention:
 *   {sanitizedTitle}+ebook.docx
 *   {sanitizedTitle}+paperback.pdf
 *   {sanitizedTitle}+cover.jpg
 *   {sanitizedTitle}+metadata.txt
 *
 * @param {string} sanitizedTitle  - Already-sanitized title slug
 * @param {Object} files           - { docx?, pdf?, jpg?, txt? } each a multer file object
 * @returns {Promise<Buffer>}      - Zip archive as a Buffer
 */
const buildZipBuffer = (sanitizedTitle, files) => {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    const passThrough = new PassThrough();

    passThrough.on('data', (chunk) => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);

    archive.on('error', reject);
    archive.pipe(passThrough);

    // Map file types to standardized output names
    const fileMap = [
      { key: 'docx', suffix: 'ebook',     ext: 'docx' },
      { key: 'pdf',  suffix: 'paperback',  ext: 'pdf'  },
      { key: 'jpg',  suffix: 'cover',      ext: 'jpg'  },
      { key: 'txt',  suffix: 'metadata',   ext: 'txt'  },
    ];

    let hasFiles = false;
    for (const { key, suffix, ext } of fileMap) {
      if (files[key] && files[key].buffer) {
        const standardizedName = `${sanitizedTitle}+${suffix}.${ext}`;
        archive.append(files[key].buffer, { name: standardizedName });
        hasFiles = true;
      }
    }

    if (!hasFiles) {
      return reject(new Error('No valid files provided for this book.'));
    }

    archive.finalize();
  });
};

module.exports = { sanitizeTitle, buildZipBuffer };
