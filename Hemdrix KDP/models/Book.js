const mongoose = require('mongoose');

const FileEntrySchema = new mongoose.Schema(
  {
    originalName: { type: String },
    standardizedName: { type: String },
    fileType: { type: String, enum: ['docx', 'pdf', 'jpg', 'txt'] },
    sizeInBytes: { type: Number },
  },
  { _id: false }
);

const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    sanitizedTitle: {
      type: String,
      required: true,
    },
    writerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['NEW', 'DOWNLOADED'],
      default: 'NEW',
    },
    downloadedAt: {
      type: Date,
      default: null,
    },
    filesIncluded: [FileEntrySchema],
  },
  {
    timestamps: true,
  }
);

// Full-text search index on title
BookSchema.index({ title: 'text' });
// Compound indexes for common query patterns
BookSchema.index({ writerId: 1, status: 1 });
BookSchema.index({ targetUploaderId: 1, status: 1 });

module.exports = mongoose.model('Book', BookSchema);
