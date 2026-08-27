/**
 * BookFlow — Admin Dashboard Module
 * Task isolation: Overview (Stats + Recent Activity) vs User Cards Directory.
 * Clicking any User Card opens a detailed modal with profile & management actions.
 */

import {
  showToast, showSkeleton, showModal, api, escapeHtml,
  formatDate, setButtonLoading
} from './components.js';

let currentUser = null;
let activeAdminTab = 'OVERVIEW'; // 'OVERVIEW' | 'USERS'
let cachedUsers = [];
let cachedStats = null;
let cachedActivity = [];
let userSearchQuery = '';

export function renderAdmin(user) {
  currentUser = user;
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="content-container">
      <!-- Desktop Tab Bar & Action Controls -->
      <div class="desktop-tab-container" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <div class="tab-bar" id="admin-tab-bar">
          <button class="tab-btn active" id="admin-tab-overview" data-tab="OVERVIEW" onclick="window._adminTab('OVERVIEW')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Overview
          </button>
          <button class="tab-btn" id="admin-tab-users" data-tab="USERS" onclick="window._adminTab('USERS')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Users
            <span class="tab-count" id="admin-users-badge">0</span>
          </button>
        </div>

        <div id="admin-desktop-actions" style="display:flex;align-items:center;gap:0.75rem">
          <div id="admin-users-search-wrap" style="display:none" class="search-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" id="admin-user-search-top" class="search-input" placeholder="Search users…" />
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-user" onclick="window._adminAddUser()" style="display:none">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add User
          </button>
        </div>
      </div>

      <!-- TASK 1: OVERVIEW SECTION -->
      <section id="admin-section-overview" class="admin-task-section">
        <!-- Stats Grid (Mobile-Optimized) -->
        <div class="stats-grid" id="admin-stats">
          ${[1,2,3,4,5].map(() => `<div class="stat-card"><div class="skeleton skeleton-line short" style="height:32px;margin-bottom:6px"></div><div class="skeleton skeleton-line medium"></div></div>`).join('')}
        </div>

        <!-- Recent Activity Feed -->
        <div style="margin-top:1.75rem">
          <div class="section-header" style="margin-bottom:1rem">
            <span class="section-title">Recent Activity</span>
            <span class="text-muted" style="font-size:0.78rem">Live packaging logs</span>
          </div>
          <div id="activity-list" class="books-grid">
            <div class="skeleton-card"><div class="skeleton skeleton-line medium"></div></div>
          </div>
        </div>
      </section>

      <!-- TASK 2: USERS CARDS SECTION -->
      <section id="admin-section-users" class="admin-task-section" style="display:none">
        <!-- Mobile Search Bar for Users -->
        <div style="margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
          <div class="search-wrapper" style="flex:1;max-width:400px">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" id="admin-user-search" class="search-input" placeholder="Search by name, email, @username, role…" />
          </div>
          <div id="user-count-pill" class="text-subtle" style="font-size:0.8rem;font-weight:500"></div>
        </div>

        <!-- User Cards Grid -->
        <div id="users-cards-grid" class="users-grid">
          ${[1,2,3,4].map(() => `<div class="skeleton-card"><div class="skeleton skeleton-line medium"></div></div>`).join('')}
        </div>
      </section>
    </div>

    <!-- Mobile Native Bottom Navigation Bar -->
    <nav class="mobile-bottom-bar" aria-label="Mobile Navigation">
      <button class="mobile-nav-item active" id="admin-mob-overview" onclick="window._adminTab('OVERVIEW')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        <span>Overview</span>
      </button>
      
      <button class="mobile-nav-action-btn" onclick="window._adminAddUser()" aria-label="Add User">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <button class="mobile-nav-item" id="admin-mob-users" onclick="window._adminTab('USERS')">
        <div class="mobile-nav-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span class="mobile-nav-badge" id="admin-mob-users-badge">0</span>
        </div>
        <span>Users</span>
      </button>
    </nav>
  `;

  window._adminTab         = switchAdminTab;
  window._adminAddUser     = () => openUserModal(null);
  window._adminViewUser    = (id) => openUserDetailsModal(id);
  window._adminEditUser    = (id) => openEditUserModal(id);
  window._adminToggle      = (id, val) => toggleUserActive(id, val);

  // Search input listeners
  const searchInput1 = document.getElementById('admin-user-search');
  const searchInput2 = document.getElementById('admin-user-search-top');
  
  const handleSearch = (e) => {
    userSearchQuery = e.target.value.trim().toLowerCase();
    if (searchInput1 && searchInput1 !== e.target) searchInput1.value = e.target.value;
    if (searchInput2 && searchInput2 !== e.target) searchInput2.value = e.target.value;
    filterAndRenderUserCards();
  };

  searchInput1?.addEventListener('input', handleSearch);
  searchInput2?.addEventListener('input', handleSearch);

  loadAdminData();
}

// ── Tab Switching ──────────────────────────────────────────────────────────────

function switchAdminTab(tab) {
  activeAdminTab = tab;

  const overviewSec = document.getElementById('admin-section-overview');
  const usersSec    = document.getElementById('admin-section-users');
  const addBtnTop   = document.getElementById('btn-add-user');
  const searchTop   = document.getElementById('admin-users-search-wrap');

  if (overviewSec) overviewSec.style.display = tab === 'OVERVIEW' ? 'block' : 'none';
  if (usersSec)    usersSec.style.display    = tab === 'USERS'    ? 'block' : 'none';
  if (addBtnTop)   addBtnTop.style.display   = tab === 'USERS'    ? 'inline-flex' : 'none';
  if (searchTop)   searchTop.style.display   = tab === 'USERS'    ? 'flex' : 'none';

  // Update Desktop Tab Buttons
  document.querySelectorAll('#admin-tab-bar .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update Mobile Bottom Bar Items
  const mobOverview = document.getElementById('admin-mob-overview');
  const mobUsers    = document.getElementById('admin-mob-users');
  if (mobOverview) mobOverview.classList.toggle('active', tab === 'OVERVIEW');
  if (mobUsers)    mobUsers.classList.toggle('active', tab === 'USERS');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Data Loading ───────────────────────────────────────────────────────────────

async function loadAdminData() {
  try {
    const [{ users }, { stats, recentActivity }] = await Promise.all([
      api('/api/admin/users'),
      api('/api/admin/stats'),
    ]);

    cachedUsers    = users || [];
    cachedStats    = stats || {};
    cachedActivity = recentActivity || [];

    // Update Badges
    const badge1 = document.getElementById('admin-users-badge');
    const badge2 = document.getElementById('admin-mob-users-badge');
    if (badge1) badge1.textContent = cachedUsers.length;
    if (badge2) badge2.textContent = cachedUsers.length;

    renderStats(cachedStats);
    filterAndRenderUserCards();
    renderActivity(cachedActivity);
  } catch (err) {
    showToast(err.message, 'error', 'Failed to load data');
  }
}

function renderStats(stats) {
  const el = document.getElementById('admin-stats');
  if (!el || !stats) return;

  const items = [
    { label: 'Total Users',       value: stats.totalUsers ?? 0 },
    { label: 'Active Writers',    value: stats.writers ?? 0 },
    { label: 'Active Uploaders',  value: stats.uploaders ?? 0 },
    { label: 'Total Packages',    value: stats.totalBooks ?? 0 },
    { label: 'Downloaded',        value: stats.downloadedBooks ?? 0 },
  ];

  el.innerHTML = items.map(({ label, value }) => `
    <div class="stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `).join('');
}

// ── Render User Cards (Instead of Table) ───────────────────────────────────────

function filterAndRenderUserCards() {
  const grid = document.getElementById('users-cards-grid');
  const countPill = document.getElementById('user-count-pill');
  if (!grid) return;

  const filtered = cachedUsers.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  if (countPill) {
    countPill.textContent = `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:3rem">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <h3>No matching users</h3>
        <p>Try searching by a different name, email, or role.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((u) => `
    <div class="user-card" onclick="window._adminViewUser('${u._id}')" role="button" tabindex="0">
      <div class="user-card-header">
        <div class="user-avatar" style="width:38px;height:38px;font-size:0.85rem">${getInitials(u.name)}</div>
        <div class="user-card-info">
          <div class="user-card-name">${escapeHtml(u.name)}</div>
          ${u.username ? `<div class="user-card-username">@${escapeHtml(u.username)}</div>` : `<div class="user-card-email">${escapeHtml(u.email)}</div>`}
        </div>
        <span class="role-badge ${u.role}">${u.role}</span>
      </div>

      <div class="user-card-body">
        <div class="user-card-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          <span>${escapeHtml(u.email)}</span>
        </div>
        <div class="user-card-row text-muted" style="font-size:0.75rem">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Joined ${formatDate(u.createdAt)}
        </div>
      </div>

      <div class="user-card-footer">
        <div class="user-card-status">
          <span class="status-indicator-dot ${u.isActive ? 'active' : 'inactive'}"></span>
          <span>${u.isActive ? 'Active' : 'Deactivated'}</span>
        </div>
        <span class="user-card-tap-hint">Details →</span>
      </div>
    </div>
  `).join('');
}

function renderActivity(activity) {
  const el = document.getElementById('activity-list');
  if (!el) return;

  if (!activity?.length) {
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <h3>No activity logged yet</h3>
        <p>Uploaded book packages and download events will appear here.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = activity.map((b) => `
    <div class="book-card">
      <div class="book-card-header">
        <span class="book-title">${escapeHtml(b.title)}</span>
        <span class="book-status-badge ${b.status}">${b.status}</span>
      </div>
      <div class="book-meta">
        <div class="book-meta-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Writer: <strong>${escapeHtml(b.writerId?.name || '—')}</strong>
        </div>
        <div class="book-meta-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Uploader: <strong>${escapeHtml(b.targetUploaderId?.name || '—')}</strong>
        </div>
        <div class="book-meta-row text-muted" style="font-size:0.75rem">
          Uploaded: ${formatDate(b.createdAt)}
        </div>
        ${b.downloadedAt ? `<div class="book-meta-row" style="color:var(--success);font-size:0.75rem">
          Downloaded: ${formatDate(b.downloadedAt)}
        </div>` : ''}
      </div>
    </div>
  `).join('');
}

// ── User Details Modal (Opened when clicking User Card) ────────────────────────

function openUserDetailsModal(userId) {
  const user = cachedUsers.find((u) => u._id === userId);
  if (!user) return;

  const { el, close } = showModal(`
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div class="user-avatar" style="width:36px;height:36px;font-size:0.85rem">${getInitials(user.name)}</div>
        <div>
          <h2 class="modal-title" style="font-size:1.15rem;line-height:1.2">${escapeHtml(user.name)}</h2>
          ${user.username ? `<span style="font-size:0.8rem;color:var(--accent-primary)">@${escapeHtml(user.username)}</span>` : ''}
        </div>
      </div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    
    <div class="modal-body" style="display:flex;flex-direction:column;gap:1.25rem">
      <!-- Role & Status Quick Banner -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:var(--bg-surface);border:1px solid var(--glass-border);border-radius:var(--radius-lg)">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span style="font-size:0.8rem;color:var(--text-subtle)">Role:</span>
          <span class="role-badge ${user.role}">${user.role}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span style="font-size:0.8rem;color:var(--text-subtle)">Status:</span>
          <label class="toggle" title="Toggle active status">
            <input type="checkbox" id="modal-user-toggle" ${user.isActive ? 'checked' : ''}
              ${user._id === currentUser.id ? 'disabled' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Detail Properties List -->
      <div style="display:flex;flex-direction:column;gap:0.85rem">
        <div>
          <div class="form-label" style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted)">Email Address</div>
          <div style="font-size:0.92rem;color:var(--text-main);font-weight:500;margin-top:2px">${escapeHtml(user.email)}</div>
        </div>

        ${user.username ? `
        <div>
          <div class="form-label" style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted)">Username</div>
          <div style="font-size:0.92rem;color:var(--text-main);font-weight:500;margin-top:2px">@${escapeHtml(user.username)}</div>
        </div>` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div>
            <div class="form-label" style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted)">Account Created</div>
            <div style="font-size:0.85rem;color:var(--text-subtle);margin-top:2px">${formatDate(user.createdAt)}</div>
          </div>
          <div>
            <div class="form-label" style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted)">Last Updated</div>
            <div style="font-size:0.85rem;color:var(--text-subtle);margin-top:2px">${formatDate(user.updatedAt)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="btn-close-details">Close</button>
      <button class="btn btn-primary btn-sm" id="btn-open-edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        Edit User
      </button>
    </div>
  `);

  el.querySelector('#btn-close-details').addEventListener('click', close);
  
  el.querySelector('#btn-open-edit').addEventListener('click', () => {
    close();
    openUserModal(user);
  });

  const toggle = el.querySelector('#modal-user-toggle');
  toggle?.addEventListener('change', async (e) => {
    const isAct = e.target.checked;
    await toggleUserActive(user._id, isAct);
  });
}

// ── User Create / Edit Modal ───────────────────────────────────────────────────

let editingUserId = null;

function openUserModal(existingUser) {
  editingUserId = existingUser?._id || null;
  const isEdit  = Boolean(editingUserId);

  const { el, close } = showModal(`
    <div class="modal-header">
      <h2 class="modal-title">${isEdit ? 'Edit User' : 'Create New User'}</h2>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label" for="u-name">Full Name *</label>
        <input type="text" id="u-name" class="form-input" placeholder="John Doe"
          value="${escapeHtml(existingUser?.name || '')}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="u-username">Username (optional)</label>
        <input type="text" id="u-username" class="form-input" placeholder="johndoe"
          value="${escapeHtml(existingUser?.username || '')}" />
        <span class="form-hint">Used for sign in alongside email</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="u-email">Email Address *</label>
        <input type="email" id="u-email" class="form-input" placeholder="john@company.com"
          value="${escapeHtml(existingUser?.email || '')}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="u-role">Role *</label>
        <select id="u-role" class="form-select">
          <option value="WRITER"   ${existingUser?.role === 'WRITER'   ? 'selected' : ''}>Writer</option>
          <option value="UPLOADER" ${existingUser?.role === 'UPLOADER' ? 'selected' : ''}>Uploader</option>
          <option value="ADMIN"    ${existingUser?.role === 'ADMIN'    ? 'selected' : ''}>Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="u-password">${isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
        <input type="password" id="u-password" class="form-input" placeholder="••••••••"
          ${isEdit ? '' : 'required'} />
      </div>
      <div id="u-error" class="form-error" style="display:none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span id="u-error-msg"></span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="u-cancel">Cancel</button>
      <button class="btn btn-primary" id="u-submit">
        <span class="btn-text">${isEdit ? 'Save Changes' : 'Create User'}</span>
      </button>
    </div>
  `);

  el.querySelector('#u-cancel').addEventListener('click', close);

  el.querySelector('#u-submit').addEventListener('click', async () => {
    const errEl  = el.querySelector('#u-error');
    const errMsg = el.querySelector('#u-error-msg');
    const btn    = el.querySelector('#u-submit');

    errEl.style.display = 'none';

    const name     = el.querySelector('#u-name').value.trim();
    const username = el.querySelector('#u-username').value.trim();
    const email    = el.querySelector('#u-email').value.trim();
    const role     = el.querySelector('#u-role').value;
    const password = el.querySelector('#u-password').value;

    if (!name || !email || !role || (!isEdit && !password)) {
      errMsg.textContent = 'Please fill in all required fields.';
      errEl.style.display = 'flex';
      return;
    }

    setButtonLoading(btn, true);
    try {
      if (isEdit) {
        const body = { name, email, username, role };
        if (password) body.password = password;
        await api(`/api/admin/users/${editingUserId}`, { method: 'PATCH', body: JSON.stringify(body) });
        showToast('User updated successfully.', 'success');
      } else {
        await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ name, email, username, password, role }) });
        showToast('User created successfully.', 'success');
      }
      close();
      loadAdminData();
    } catch (err) {
      errMsg.textContent = err.message;
      errEl.style.display = 'flex';
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

async function openEditUserModal(userId) {
  const user = cachedUsers.find((u) => u._id === userId);
  openUserModal(user || null);
}

async function toggleUserActive(userId, isActive) {
  try {
    await api(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    showToast(`User ${isActive ? 'activated' : 'deactivated'}.`, isActive ? 'success' : 'warning');
    
    // Update local cache
    const target = cachedUsers.find((u) => u._id === userId);
    if (target) target.isActive = isActive;
    filterAndRenderUserCards();
  } catch (err) {
    showToast(err.message, 'error');
    loadAdminData();
  }
}

function getInitials(name) {
  return name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';
}
