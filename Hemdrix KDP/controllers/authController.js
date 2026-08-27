const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * POST /api/auth/login
 * Authenticates user and sets HttpOnly JWT cookie.
 */
const login = async (req, res) => {
  try {
    const { email, username, identifier, loginIdentifier, password } = req.body;
    const loginInput = (loginIdentifier || identifier || username || email || '').trim();

    if (!loginInput || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const safeEscaped = loginInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { email: loginInput.toLowerCase() },
        { username: loginInput.toLowerCase() },
        { name: { $regex: new RegExp(`^${safeEscaped}$`, 'i') } },
      ],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or account is deactivated.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    // Set HttpOnly, Secure, SameSite=Strict cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    res.json({
      user: user.toJSON(),
      message: 'Login successful.',
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully.' });
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -pushSubscription');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key for client-side subscription.
 */
const getVapidPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

module.exports = { login, logout, getMe, getVapidPublicKey };
