/**
 * BookFlow — Application Root
 * Handles: PWA registration, install prompt banner, auth check, theme switching, navbar, routing, and logout.
 */

import { renderLogin } from './auth.js';
import { initSocket, disconnectSocket } from './socket.js';
import { renderWriter } from './writer.js';
import { renderUploader } from './uploader.js';
import { renderAdmin } from './admin.js';
import { showToast, api, escapeHtml } from './components.js';

let currentUser = null;
let deferredInstallPrompt = null;

// ── Theme State & Management ──────────────────────────────────────────────────

function getStoredTheme() {
  return localStorage.getItem('bookflow-theme') || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bookflow-theme', theme);
  updateThemeIcons(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(`Switched to ${next} mode`, 'info');
}

function updateThemeIcons(theme) {
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach((btn) => {
    btn.innerHTML = theme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Switch to light mode"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Switch to dark mode"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  });
}

// Initial theme application
applyTheme(getStoredTheme());

// ── PWA Service Worker & Install Prompt ───────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SW] Registered:', reg.scope))
      .catch((err) => console.error('[SW] Registration failed:', err));
  });
}

// Check if app is already running in standalone/installed mode
function isAppInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    localStorage.getItem('bookflow-pwa-installed') === 'true'
  );
}

// Capture install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent mini-infobar on mobile
  e.preventDefault();
  deferredInstallPrompt = e;

  if (!isAppInstalled() && !sessionStorage.getItem('bookflow-pwa-dismissed')) {
    showPWAInstallBanner();
  }
});

window.addEventListener('appinstalled', () => {
  localStorage.setItem('bookflow-pwa-installed', 'true');
  deferredInstallPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
  showToast('BookFlow installed successfully!', 'success');
});

function showPWAInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pwa-install-left">
      <img src="/icon.png" class="pwa-install-logo" alt="BookFlow" style="width:36px;height:36px;border-radius:50%;background:#ffffff;padding:3px;object-fit:contain;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.2)" />
      <div class="pwa-install-text">
        <div class="pwa-install-title">Install BookFlow App</div>
        <div class="pwa-install-subtitle">Fast offline access & native notifications</div>
      </div>
    </div>
    <div class="pwa-install-actions">
      <button class="btn btn-ghost btn-sm" id="btn-pwa-dismiss" style="padding:4px 8px;font-size:0.75rem">Not Now</button>
      <button class="btn btn-primary btn-sm" id="btn-pwa-install" style="padding:4px 12px;font-size:0.75rem">Install</button>
    </div>
  `;

  document.body.appendChild(banner);

  banner.querySelector('#btn-pwa-dismiss').addEventListener('click', () => {
    banner.style.animation = 'fadeOut 0.3s ease forwards';
    sessionStorage.setItem('bookflow-pwa-dismissed', 'true');
    setTimeout(() => banner.remove(), 300);
  });

  banner.querySelector('#btn-pwa-install').addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showToast('To install: use your browser menu "Install BookFlow" or "Add to Home Screen".', 'info');
      banner.remove();
      return;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('bookflow-pwa-installed', 'true');
    }
    deferredInstallPrompt = null;
    banner.remove();
  });
}

// ── Application Boot ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await boot();
});

async function boot() {
  try {
    const { user } = await api('/api/auth/me');
    currentUser = user;
    initApp(user);
  } catch {
    // Not authenticated — show login
    showLoginPage();
  }
}

function showLoginPage() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  renderLogin((user) => {
    currentUser = user;
    initApp(user);
  });
}

// ── App Initialization ────────────────────────────────────────────────────────

function initApp(user) {
  renderAppShell(user);
  initSocket(user);
  routeTo(user.role);
  updateThemeIcons(getStoredTheme());

  // Check if we should show install prompt after login
  if (!isAppInstalled() && deferredInstallPrompt && !sessionStorage.getItem('bookflow-pwa-dismissed')) {
    setTimeout(showPWAInstallBanner, 1500);
  }
}

// ── App Shell ─────────────────────────────────────────────────────────────────

function renderAppShell(user) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Navbar -->
    <nav class="app-navbar" role="navigation" aria-label="Main navigation">
      <div class="navbar-brand">
        <img src="/icon.png" class="brand-logo" alt="BookFlow" style="width:32px;height:32px;border-radius:50%;background:#ffffff;padding:3px;object-fit:contain;flex-shrink:0;box-shadow:0 2px 10px rgba(0,0,0,0.2)" />
        <span class="text-gradient">BookFlow</span>
      </div>

      <div class="navbar-right">
        <!-- Light / Dark Theme Toggle Button -->
        <button class="theme-toggle-btn" onclick="window._toggleTheme()" aria-label="Toggle Theme">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
          </svg>
        </button>

        <!-- WebSocket live indicator -->
        <div class="ws-indicator" title="Real-time connection status">
          <div class="ws-dot" id="ws-dot"></div>
          <span id="ws-text">Connecting</span>
        </div>

        <!-- User pill with role badge -->
        <div class="user-pill" id="user-pill" onclick="toggleUserMenu()" aria-haspopup="true">
          <div class="user-avatar" aria-hidden="true">${getInitials(user.name)}</div>
          <span class="user-name">${escapeHtml(user.name)}</span>
          <span class="role-badge ${user.role}">${user.role}</span>
        </div>

        <!-- Dropdown Menu -->
        <div id="user-menu" style="display:none;position:absolute;top:70px;right:1.5rem;
          background:var(--bg-elevated);border:1px solid var(--glass-border);border-radius:14px;
          padding:0.5rem;min-width:180px;box-shadow:var(--shadow-xl);z-index:1000">
          <div style="padding:0.5rem 0.75rem 0.25rem;font-size:0.75rem;color:var(--text-muted);
            letter-spacing:0.1em;text-transform:uppercase;font-weight:600">Account</div>
          
          <button onclick="window._toggleTheme()"
            style="display:flex;width:100%;padding:0.6rem 0.75rem;background:none;border:none;
            color:var(--text-main);font-size:0.875rem;cursor:pointer;border-radius:8px;
            align-items:center;gap:0.6rem;font-family:inherit;transition:all 0.15s"
            onmouseover="this.style.background='var(--glass-bg-hover)'"
            onmouseout="this.style.background='none'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
            </svg>
            Toggle Theme
          </button>

          <div class="divider" style="margin:0.35rem 0"></div>

          <button id="logout-btn" onclick="window._logout()"
            style="display:flex;width:100%;padding:0.6rem 0.75rem;background:none;border:none;
            color:var(--danger);font-size:0.875rem;cursor:pointer;border-radius:8px;
            align-items:center;gap:0.6rem;font-family:inherit;transition:all 0.15s"
            onmouseover="this.style.background='var(--danger-soft)'"
            onmouseout="this.style.background='none'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="app-main" id="main-content" role="main">
      <!-- Dashboard will be injected here -->
    </main>
  `;

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    const pill = document.getElementById('user-pill');
    if (menu && !menu.contains(e.target) && !pill.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  window.toggleUserMenu = () => {
    const menu = document.getElementById('user-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  };

  window._toggleTheme = toggleTheme;
  window._logout = logout;
}

// ── Routing ───────────────────────────────────────────────────────────────────

function routeTo(role) {
  switch (role) {
    case 'WRITER':   renderWriter(currentUser);   break;
    case 'UPLOADER': renderUploader(currentUser); break;
    case 'ADMIN':    renderAdmin(currentUser);    break;
    default:
      document.getElementById('main-content').innerHTML =
        '<div class="empty-state"><p>Unknown role. Please contact your administrator.</p></div>';
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
    disconnectSocket();
    currentUser = null;
    showToast('You have been signed out.', 'info');
    setTimeout(showLoginPage, 600);
  } catch {
    showLoginPage();
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BF';
}
