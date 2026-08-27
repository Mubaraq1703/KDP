/**
 * BookFlow — Shared UI Components
 * Toast notifications, skeleton loaders, modals, and utility helpers.
 */

// ── Toast Notification System ─────────────────────────────────────────────────

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'region');
    toastContainer.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

const TOAST_ICONS = {
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

/**
 * Displays a floating toast notification.
 * @param {string} message  - Primary message text
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} [title]  - Optional bold title
 * @param {number} [duration] - Auto-dismiss duration in ms (default 4000)
 */
export function showToast(message, type = 'info', title = null, duration = 4000) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); });

  return dismiss;
}

// ── Skeleton Loaders ──────────────────────────────────────────────────────────

/**
 * Renders N skeleton card placeholders into a container.
 * @param {HTMLElement} container
 * @param {number} count
 */
export function showSkeleton(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line medium" style="height:20px"></div>
      <div class="skeleton skeleton-line long"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short" style="margin-top:8px"></div>
    `;
    container.appendChild(card);
  }
}

/**
 * Clears skeleton loaders from a container.
 * @param {HTMLElement} container
 */
export function hideSkeleton(container) {
  container.innerHTML = '';
}

// ── Modal System ──────────────────────────────────────────────────────────────

let activeModal = null;

/**
 * Renders a modal overlay with the provided HTML content.
 * @param {string} contentHTML  - Inner modal HTML
 * @param {Object} [options]
 * @param {boolean} [options.wide] - Use wider modal
 * @param {Function} [options.onClose] - Callback on close
 * @returns {{ el: HTMLElement, close: Function }}
 */
export function showModal(contentHTML, options = {}) {
  closeModal(); // Close any existing modal

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal-overlay';

  const modal = document.createElement('div');
  modal.className = `modal${options.wide ? ' modal-wide' : ''}`;
  modal.innerHTML = contentHTML;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  activeModal = overlay;

  const close = () => {
    overlay.style.animation = 'fadeOut 0.2s ease forwards';
    modal.style.animation = 'fadeOut 0.15s ease forwards';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      activeModal = null;
      options.onClose?.();
    }, 200);
  };

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close on ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  // Wire up .modal-close buttons
  modal.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  return { el: modal, close };
}

/**
 * Closes the currently active modal.
 */
export function closeModal() {
  activeModal?.querySelector('.modal')?.style && (
    activeModal.remove(),
    (document.body.style.overflow = ''),
    (activeModal = null)
  );
}

// ── HTML Utilities ────────────────────────────────────────────────────────────

/**
 * Escapes HTML entities to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Formats a date string to a human-readable timestamp.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Formats file size in bytes to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Debounces a function call.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Sets button loading state.
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 */
export function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  }
}

/**
 * Renders file type pills from a filesIncluded array.
 * @param {Array} files
 * @returns {string} HTML string
 */
export function renderFilePills(files = []) {
  if (!files.length) return '<span class="text-muted" style="font-size:0.75rem">No files</span>';
  return files.map((f) => `
    <span class="file-pill ${f.fileType}">${fileTypeIcon(f.fileType)} .${f.fileType}</span>
  `).join('');
}

export function fileTypeIcon(type) {
  const icons = {
    pdf: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    docx: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    jpg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    txt: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`
  };
  return icons[type] || `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
}

/**
 * Makes an API request with credentials and JSON defaults.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

/**
 * Makes a multipart form data API request.
 * @param {string} url
 * @param {FormData} formData
 * @returns {Promise<any>}
 */
export async function apiUpload(url, formData) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Don't set Content-Type — browser sets it with boundary
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Upload failed with status ${res.status}`);
  }

  return data;
}

/**
 * Triggers a file download from the backend stream proxy.
 * @param {string} url    - API endpoint for download
 * @param {string} filename - Suggested filename
 */
export async function triggerDownload(url, filename) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed.');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
