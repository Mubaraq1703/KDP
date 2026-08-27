const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');

/**
 * GET /api/admin/users
 * Returns all users (without sensitive fields).
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash -pushSubscription').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

/**
 * POST /api/admin/users
 * Creates a new user account.
 */
const createUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are all required.' });
    }

    if (!['ADMIN', 'WRITER', 'UPLOADER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be ADMIN, WRITER, or UPLOADER.' });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const cleanUsername = username ? username.trim().toLowerCase() : null;
    if (cleanUsername) {
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        return res.status(409).json({ error: 'This username is already taken.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: cleanUsername || undefined,
      passwordHash,
      role,
    });

    res.status(201).json({ user: user.toJSON(), message: 'User created successfully.' });
  } catch (err) {
    console.error('[Admin] Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user.' });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Updates user fields: name, email, username, role, isActive, and optionally password.
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, username, role, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Prevent admin from deactivating themselves
    if (id === req.user.id && isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername) {
        const existing = await User.findOne({ username: cleanUsername, _id: { $ne: id } });
        if (existing) {
          return res.status(409).json({ error: 'This username is already taken.' });
        }
        user.username = cleanUsername;
      } else {
        user.username = undefined;
      }
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }
      user.email = cleanEmail;
    }
    if (role !== undefined && ['ADMIN', 'WRITER', 'UPLOADER'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 12);
    }

    await user.save();
    res.json({ user: user.toJSON(), message: 'User updated successfully.' });
  } catch (err) {
    console.error('[Admin] Update user error:', err.message);
    res.status(500).json({ error: 'Failed to update user.' });
  }
};

/**
 * GET /api/admin/stats
 * Returns high-level system statistics for the audit dashboard.
 */
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalBooks, downloadedBooks, writers, uploaders] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Book.countDocuments({ status: 'DOWNLOADED' }),
      User.countDocuments({ role: 'WRITER', isActive: true }),
      User.countDocuments({ role: 'UPLOADER', isActive: true }),
    ]);

    const recentActivity = await Book.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('writerId', 'name')
      .populate('targetUploaderId', 'name')
      .select('title status createdAt downloadedAt writerId targetUploaderId');

    res.json({
      stats: { totalUsers, totalBooks, downloadedBooks, writers, uploaders },
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

module.exports = { getUsers, createUser, updateUser, getStats };
