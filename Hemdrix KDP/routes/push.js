const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');

/**
 * POST /api/push/subscribe
 * Saves the Web Push subscription object for the authenticated Uploader.
 */
router.post('/subscribe', authenticate, authorize('UPLOADER'), async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid push subscription object.' });
    }

    await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });

    res.json({ message: 'Push subscription saved successfully.' });
  } catch (err) {
    console.error('[Push] Subscribe error:', err.message);
    res.status(500).json({ error: 'Failed to save push subscription.' });
  }
});

/**
 * DELETE /api/push/unsubscribe
 * Removes the push subscription for the authenticated user.
 */
router.delete('/unsubscribe', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { pushSubscription: null });
    res.json({ message: 'Push subscription removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove push subscription.' });
  }
});

module.exports = router;
