const multer = require('multer');

// Use in-memory storage — no disk writes on the server
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_MIMES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'text/plain': 'txt',
};

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: .docx, .pdf, .jpg, .txt`), false);
  }
};

// Build accepted field names for up to 5 books × 4 file types
const buildFields = () => {
  const fields = [];
  for (let i = 0; i < 5; i++) {
    fields.push({ name: `book_${i}_docx`, maxCount: 1 });
    fields.push({ name: `book_${i}_pdf`, maxCount: 1 });
    fields.push({ name: `book_${i}_jpg`, maxCount: 1 });
    fields.push({ name: `book_${i}_txt`, maxCount: 1 });
  }
  return fields;
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // 50 MB per file (generous for manuscripts and covers)
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = { upload, buildFields, ALLOWED_MIMES };
