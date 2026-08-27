/**
 * BookFlow — Uploader Dashboard Module
 * Handles Web Push subscription, real-time book assignment alerts, search, and download streaming.
 */

import {
  showToast, showSkeleton, api, escapeHtml,
  formatDate, renderFilePills, triggerDownload, debounce
} from './components.js';
import { onSocketEvent } from './socket.js';

let currentUser = null;
let activeTab    = 'NEW';
let searchQuery  = '';
let allNewBooks  = [];
let allDownBooks = [];

export function renderUploader(user) {
  currentUser = user;
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="content-container">
      <!-- Push Notification Banner -->
      <div id="push-banner" style="display:none"></div>

      <!-- Top Controls Bar (Search + Desktop Tab Bar) -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <!-- Tab Bar (Desktop / Tablet) -->
        <div class="desktop-tab-container" style="display:flex;align-items:center;gap:1rem">
          <div class="tab-bar" id="uploader-tab-bar">
            <button class="tab-btn active" data-tab="NEW" onclick="window._uploaderTab('NEW')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              New Books
              <span class="tab-count" id="u-count-new">0</span>
            </button>
            <button class="tab-btn" data-tab="DOWNLOADED" onclick="window._uploaderTab('DOWNLOADED')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Downloaded
              <span class="tab-count" id="u-count-down">0</span>
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-wrapper" style="flex:1;max-width:360px">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="search" id="uploader-search" class="search-input" placeholder="Search assigned books…" />
        </div>
      </div>

      <!-- Books Grid -->
      <div id="uploader-books-grid" class="books-grid">
      </div>
    </div>

    <!-- Bottom Navigation Bar (Visible across Mobile, Tablet, & Desktop) -->
    <nav class="mobile-bottom-bar" aria-label="Navigation">
      <button class="mobile-nav-item active" id="u-mob-tab-new" onclick="window._uploaderTab('NEW')">
        <div class="mobile-nav-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span class="mobile-nav-badge" id="u-mob-count-new">0</span>
        </div>
        <span>New</span>
      </button>

      <button class="mobile-nav-item" id="u-mob-tab-down" onclick="window._uploaderTab('DOWNLOADED')">
        <div class="mobile-nav-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span class="mobile-nav-badge" id="u-mob-count-down">0</span>
        </div>
        <span>Downloaded</span>
      </button>
    </nav>
  `;

  window._uploaderTab      = switchTab;
  window._uploaderDownload = downloadBook;
  window._enablePush       = requestPushPermission;

  // Search input handler
  const searchInput = document.getElementById('uploader-search');
  searchInput?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    loadBooks();
  }, 350));

  // Listen for real-time book assignment from Writers
  onSocketEvent('book:assigned', handleBookAssigned);

  initPushBanner();
  loadBooks();
}

// ── Push Notification Banner ───────────────────────────────────────────────────

async function initPushBanner() {
  const banner = document.getElementById('push-banner');
  if (!banner) return;

  // Check if push is supported and not yet granted
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'granted') return; // Already enabled

  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="push-banner">
      <div class="push-banner-left">
        <div class="push-banner-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </div>
        <div class="push-banner-text">
          <h3>Enable Push Notifications</h3>
          <p>Get instantly notified when new books are assigned to you.</p>
        </div>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" onclick="window._enablePush()">
          Enable Notifications
        </button>
      </div>
    </div>
  `;
}

async function requestPushPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Push notifications were denied.', 'warning');
      return;
    }

    // Get VAPID public key from server
    const { publicKey } = await api('/api/auth/vapid-public-key');

    // Register service worker and get subscription
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Save subscription to server
    await api('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });

    showToast('Push notifications enabled. You will be notified of new books.', 'success', 'Notifications Active');

    // Hide the banner
    const banner = document.getElementById('push-banner');
    if (banner) {
      banner.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => (banner.style.display = 'none'), 400);
    }
  } catch (err) {
    console.error('[Push] Subscription error:', err);
    showToast(err.message || 'Could not enable notifications.', 'error');
  }
}

/** Converts base64 VAPID key to Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary  = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// ── Tab Switching ──────────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('#uploader-tab-bar .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const mobNew  = document.getElementById('u-mob-tab-new');
  const mobDown = document.getElementById('u-mob-tab-down');
  if (mobNew)  mobNew.classList.toggle('active', tab === 'NEW');
  if (mobDown) mobDown.classList.toggle('active', tab === 'DOWNLOADED');

  renderBookGrid(tab === 'NEW' ? allNewBooks : allDownBooks);
}

// ── Load Books ─────────────────────────────────────────────────────────────────

async function loadBooks() {
  const grid = document.getElementById('uploader-books-grid');
  showSkeleton(grid, 4);

  try {
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    const [{ books: newBooks }, { books: downBooks }] = await Promise.all([
      api(`/api/uploader/books?tab=NEW${searchParam}`),
      api(`/api/uploader/books?tab=DOWNLOADED${searchParam}`),
    ]);

    allNewBooks  = newBooks || [];
    allDownBooks = downBooks || [];

    updateTabCounts(allNewBooks.length, allDownBooks.length);
    renderBookGrid(activeTab === 'NEW' ? allNewBooks : allDownBooks);
  } catch (err) {
    grid.innerHTML = '';
    showToast(err.message, 'error', 'Failed to load books');
  }
}

function updateTabCounts(newCount, downCount) {
  const newEl  = document.getElementById('u-count-new');
  const downEl = document.getElementById('u-count-down');
  const mobNew  = document.getElementById('u-mob-count-new');
  const mobDown = document.getElementById('u-mob-count-down');

  if (newEl)  newEl.textContent  = newCount;
  if (downEl) downEl.textContent = downCount;
  if (mobNew)  mobNew.textContent  = newCount;
  if (mobDown) mobDown.textContent = downCount;
}

// ── Socket.io Real-time Book Assigned Handler ──────────────────────────────────

function handleBookAssigned({ book }) {
  if (!book) return;

  // Add to local new books array
  const existingIdx = allNewBooks.findIndex((b) => b._id === book._id);
  if (existingIdx === -1) {
    allNewBooks = [book, ...allNewBooks];
  }

  // Update counts
  updateTabCounts(allNewBooks.length, allDownBooks.length);

  // Pop animation on badge
  const newBadge = document.getElementById('u-mob-count-new');
  newBadge?.classList.add('pop');
  setTimeout(() => newBadge?.classList.remove('pop'), 500);

  // If on NEW tab, render the new card with entrance animation
  if (activeTab === 'NEW') {
    const grid = document.getElementById('uploader-books-grid');
    // Remove empty state if present
    if (grid?.querySelector('.empty-state')) {
      grid.innerHTML = '';
    }
    const card = createBookCard(book);
    card.classList.add('realtime-update');
    grid?.prepend(card);
  }

  showToast(`"${book.title}" was assigned to you.`, 'success', 'New Book Assigned');
}

// ── Render Book Cards ──────────────────────────────────────────────────────────

function renderBookGrid(books) {
  const grid = document.getElementById('uploader-books-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!books.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <h3>${activeTab === 'NEW' ? 'No new books assigned' : 'Nothing downloaded yet'}</h3>
        <p>${activeTab === 'NEW'
          ? 'New books assigned to you will appear here.'
          : 'Downloaded books will be archived here for re-download.'}</p>
      </div>
    `;
    return;
  }

  books.forEach((book) => {
    const card = createBookCard(book);
    grid.appendChild(card);
  });
}

function createBookCard(book) {
  const card = document.createElement('div');
  card.className = `book-card${book.status === 'DOWNLOADED' ? ' status-downloaded' : ''}`;
  card.dataset.bookId = book._id;
  card.classList.add('entering');

  card.innerHTML = `
    <div class="book-card-header">
      <h3 class="book-title">${escapeHtml(book.title)}</h3>
      <span class="book-status-badge ${book.status}">${book.status}</span>
    </div>

    <div class="book-meta">
      <div class="book-meta-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        From: <strong>${escapeHtml(book.writerId?.name || '—')}</strong>
      </div>
      <div class="book-meta-row text-muted" style="font-size:0.75rem">
        Received: ${formatDate(book.createdAt)}
      </div>
      ${book.status === 'DOWNLOADED' && book.downloadedAt ? `
      <div class="book-download-ts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Downloaded: ${formatDate(book.downloadedAt)}
      </div>` : ''}
    </div>

    <div class="book-files">
      ${renderFilePills(book.filesIncluded)}
    </div>

    <div class="book-card-footer">
      <button
        class="btn ${book.status === 'NEW' ? 'btn-success' : 'btn-ghost'} btn-sm"
        id="dl-btn-${book._id}"
        onclick="window._uploaderDownload('${book._id}', '${escapeHtml(book.sanitizedTitle)}')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        ${book.status === 'NEW' ? 'Download ZIP' : 'Re-Download ZIP'}
      </button>
    </div>
  `;

  return card;
}

// ── Download Handler ───────────────────────────────────────────────────────────

async function downloadBook(bookId, sanitizedTitle) {
  const btn = document.getElementById(`dl-btn-${bookId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Downloading…
    `;
  }

  try {
    await triggerDownload(`/api/uploader/books/${bookId}/download`, `${sanitizedTitle}.zip`);
    showToast('ZIP package downloaded successfully.', 'success', 'Download Complete');

    // Reload books to reflect status change
    setTimeout(() => loadBooks(), 1200);
  } catch (err) {
    showToast(err.message, 'error', 'Download failed');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download ZIP
      `;
    }
  }
}
