// src/ui/authUI.js
// ─────────────────────────────────────────────
// Builds the Login / Signup UI as a DocumentFragment.
// No framework — pure DOM. Styles live in style.css.
// ─────────────────────────────────────────────


// Imports (only CSS, no JS dependencies)
import '../css/global.css';
import '../css/dashboard.css';
import '../css/auth.css';

/**
 * Builds and returns a DocumentFragment containing both the
 * login panel and the signup panel. Only one is visible at a time.
 *
 * Panel switching is handled in main.js via switchPanel().
 *
 * @returns {DocumentFragment}
 */
export function renderAuthUI() {
  const tpl = document.createElement('template');

  tpl.innerHTML = /* html */ `
    <div class="auth-scene">

      <!-- ░░ Atmospheric background layers ░░ -->
      <div class="auth-bg" aria-hidden="true">
        <div class="auth-bg__orb auth-bg__orb--a"></div>
        <div class="auth-bg__orb auth-bg__orb--b"></div>
        <div class="auth-bg__orb auth-bg__orb--c"></div>
      </div>

      <!-- ░░ Card container ░░ -->
      <div class="auth-card" role="main">

        <!-- Brand -->
        <div class="auth-brand" aria-label="WeatherTide">
          <span class="auth-brand__icon" aria-hidden="true">⛅</span>
          <span class="auth-brand__name">WeatherTide</span>
        </div>

        <!-- ════════════════════════════════
             LOGIN PANEL
        ════════════════════════════════ -->
        <section
          id="panel-login"
          class="auth-panel"
          aria-label="Login form"
        >
          <h1 class="auth-heading">Welcome back</h1>
          <p class="auth-sub">Sign in to see your forecast.</p>

          <form id="login-form" novalidate>
            <div class="field-group">
              <label class="field-label" for="login-email">Email</label>
              <input
                id="login-email"
                class="field-input"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div class="field-group">
              <label class="field-label" for="login-password">Password</label>
              <div class="field-input-wrap">
                <input
                  id="login-password"
                  class="field-input"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  class="toggle-pw"
                  aria-label="Toggle password visibility"
                  data-target="login-password"
                >👁</button>
              </div>
            </div>

            <!-- Error message -->
            <p id="login-error" class="auth-error" role="alert" aria-live="polite"></p>

            <button
              type="submit"
              id="login-submit-btn"
              class="btn btn-primary"
              data-loading-text="Signing in…"
            >
              Sign in
            </button>
          </form>

          <p class="auth-switch">
            Don't have an account?
            <button id="to-signup" class="btn-link">Create one →</button>
          </p>
        </section>

        <!-- ════════════════════════════════
             SIGNUP PANEL (hidden initially)
        ════════════════════════════════ -->
        <section
          id="panel-signup"
          class="auth-panel panel--hidden"
          aria-label="Sign up form"
        >
          <h1 class="auth-heading">Create account</h1>
          <p class="auth-sub">Start tracking weather your way.</p>

          <form id="signup-form" novalidate>
            <div class="field-group">
              <label class="field-label" for="signup-email">Email</label>
              <input
                id="signup-email"
                class="field-input"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div class="field-group">
              <label class="field-label" for="signup-password">Password</label>
              <div class="field-input-wrap">
                <input
                  id="signup-password"
                  class="field-input"
                  type="password"
                  autocomplete="new-password"
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  class="toggle-pw"
                  aria-label="Toggle password visibility"
                  data-target="signup-password"
                >👁</button>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm"
                class="field-input"
                type="password"
                autocomplete="new-password"
                placeholder="••••••••"
                required
              />
            </div>

            <!-- Error message -->
            <p id="signup-error" class="auth-error" role="alert" aria-live="polite"></p>

            <button
              type="submit"
              id="signup-submit-btn"
              class="btn btn-primary"
              data-loading-text="Creating account…"
            >
              Create account
            </button>
          </form>

          <p class="auth-switch">
            Already have an account?
            <button id="to-login" class="btn-link">Sign in →</button>
          </p>
        </section>

      </div><!-- /auth-card -->
    </div><!-- /auth-scene -->
  `;

  const fragment = tpl.content;

  // ── Wire up show/hide password toggles ───────
  fragment.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = fragment.getElementById
        ? fragment.getElementById(btn.dataset.target)
        : document.getElementById(btn.dataset.target);
      // After insertion into the DOM, query from document
      const el = document.getElementById(btn.dataset.target);
      if (!el) return;
      const isHidden = el.type === 'password';
      el.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? '🙈' : '👁';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  });

  // ── Wire panel-switch buttons ─────────────────
  // These must be attached here because main.js receives
  // a DocumentFragment and has no reliable moment to query
  // these buttons before they're in the live DOM.
  // We use event delegation on the fragment root instead.

  const loginPanel  = fragment.querySelector('#panel-login');
  const signupPanel = fragment.querySelector('#panel-signup');
  const toSignupBtn = fragment.querySelector('#to-signup');
  const toLoginBtn  = fragment.querySelector('#to-login');

  toSignupBtn?.addEventListener('click', () => {
    loginPanel?.classList.add('panel--hidden');
    signupPanel?.classList.remove('panel--hidden');
    fragment.querySelector('#signup-email')?.focus();
  });

  toLoginBtn?.addEventListener('click', () => {
    signupPanel?.classList.add('panel--hidden');
    loginPanel?.classList.remove('panel--hidden');
    fragment.querySelector('#login-email')?.focus();
  });

  return fragment;
}
