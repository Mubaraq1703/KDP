const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'WRITER', 'UPLOADER'],
      required: [true, 'Role is required'],
    },
    // VAPID Web Push Subscription Object (stored for Uploaders)
    pushSubscription: {
      type: Object,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Never return passwordHash in JSON responses
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.pushSubscription; // Don't expose push sub to client
  return user;
};

module.exports = mongoose.model('User', UserSchema);
