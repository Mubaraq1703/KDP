/**
 * BookFlow — Login / Auth Module
 * Renders the login page and handles authentication.
 */

import { showToast, api, setButtonLoading } from './components.js';

/**
 * Renders the login page into the app root.
 * @param {Function} onSuccess - Callback called with user object after successful login
 */
export function renderLogin(onSuccess) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <img src="/icon.png" class="login-logo-mark" alt="BookFlow" style="width:56px;height:56px;border-radius:50%;background:#ffffff;padding:5px;object-fit:contain;box-shadow:0 8px 24px rgba(99,102,241,0.35)" />
        </div>

        <div class="login-heading">
          <h1><span class="text-gradient">BookFlow</span></h1>
          <p>Document Packaging &amp; Distribution Engine</p>
        </div>

        <form id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="login-identifier">Username or Email</label>
            <input
              type="text"
              id="login-identifier"
              class="form-input"
              placeholder="username or you@company.com"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              class="form-input"
              placeholder="••••••••••"
              autocomplete="current-password"
              required
            />
          </div>

          <div id="login-error" class="form-error" style="display:none;margin-bottom:1rem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span id="login-error-msg"></span>
          </div>

          <button type="submit" id="login-btn" class="btn btn-primary btn-lg" style="width:100%">
            <span class="btn-text">Sign In</span>
          </button>
        </form>

        <p style="text-align:center;margin-top:2rem;font-size:0.8rem;color:rgba(255,255,255,0.3)">
          Secure access · Role-based permissions · PWA
        </p>
      </div>
    </div>
  `;

  const form    = document.getElementById('login-form');
  const btn     = document.getElementById('login-btn');
  const errBox  = document.getElementById('login-error');
  const errMsg  = document.getElementById('login-error-msg');

  const showError = (msg) => {
    errMsg.textContent = msg;
    errBox.style.display = 'flex';
  };

  const clearError = () => {
    errBox.style.display = 'none';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const identifier = document.getElementById('login-identifier').value.trim();
    const password   = document.getElementById('login-password').value;

    if (!identifier || !password) {
      return showError('Please enter your username/email and password.');
    }

    setButtonLoading(btn, true);
    try {
      const { user } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      showToast('Welcome back!', 'success', `Signed in as ${user.name}`);
      onSuccess(user);
    } catch (err) {
      showError(err.message || 'Login failed. Please try again.');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}
