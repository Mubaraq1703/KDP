/**
 * BookFlow — Socket.io Client
 * Manages the real-time WebSocket connection and exposes an event bus.
 */

let socket = null;
const listeners = new Map();

/**
 * Initializes the Socket.io connection.
 * Should be called after the user is authenticated (cookie is set).
 * @param {Object} user - Authenticated user object
 * @returns {Object} socket instance
 */
export function initSocket(user) {
  if (socket?.connected) return socket;

  // Socket.io client loaded from CDN in index.html
  socket = io({
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    updateWsIndicator(true);

    // Auto-join dedicated rooms for real-time updates
    if (user.role === 'WRITER') {
      socket.emit('join:writer');
    }
    if (user.role === 'UPLOADER') {
      socket.emit('join:uploader');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    updateWsIndicator(false);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
    updateWsIndicator(false);
  });

  // Forward all events to registered listeners
  socket.onAny((event, ...args) => {
    const cbs = listeners.get(event);
    if (cbs) cbs.forEach((cb) => cb(...args));
  });

  return socket;
}

/**
 * Registers a listener for a specific Socket.io event.
 * @param {string} event
 * @param {Function} callback
 */
export function onSocketEvent(event, callback) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(callback);
}

/**
 * Removes a listener for a specific event.
 * @param {string} event
 * @param {Function} callback
 */
export function offSocketEvent(event, callback) {
  if (!listeners.has(event)) return;
  const cbs = listeners.get(event).filter((cb) => cb !== callback);
  listeners.set(event, cbs);
}

/**
 * Disconnects the socket (e.g. on logout).
 */
export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  listeners.clear();
  updateWsIndicator(false);
}

/**
 * Updates the WebSocket connection status indicator in the navbar.
 * @param {boolean} connected
 */
function updateWsIndicator(connected) {
  const dot  = document.getElementById('ws-dot');
  const text = document.getElementById('ws-text');
  if (!dot) return;

  dot.className  = `ws-dot ${connected ? 'connected' : 'disconnected'}`;
  if (text) text.textContent = connected ? 'Live' : 'Offline';
}
