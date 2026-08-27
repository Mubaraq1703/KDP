const webpush = require('web-push');

// Configure web-push with VAPID credentials if provided
if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.warn('[Push] Warning: Failed to initialize VAPID details:', err.message);
  }
} else {
  console.warn('[Push] Warning: VAPID credentials missing in .env. Web Push notifications will be disabled until set.');
}

/**
 * Sends a Web Push notification to a subscriber.
 *
 * @param {Object} subscription  - PushSubscription object (endpoint + keys)
 * @param {Object} payload       - { title, body, icon?, badge?, data? }
 * @returns {Promise}
 */
const sendNotification = async (subscription, payload) => {
  if (!subscription || !subscription.endpoint) {
    throw new Error('Invalid push subscription object.');
  }

  const stringified = JSON.stringify({
    title: payload.title || 'BookFlow',
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    data: payload.data || {},
  });

  try {
    await webpush.sendNotification(subscription, stringified);
  } catch (err) {
    // 404/410 means the subscription is expired/invalid
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.warn(`[Push] Subscription expired for endpoint: ${subscription.endpoint}`);
      return { expired: true };
    }
    throw err;
  }

  return { sent: true };
};

/**
 * Returns the VAPID public key for client-side subscription registration.
 * Safe to expose — it's the public key, not the private one.
 * @returns {string}
 */
const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY;

module.exports = { sendNotification, getVapidPublicKey };
