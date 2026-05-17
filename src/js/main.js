// src/main.js
// ─────────────────────────────────────────────
// WeatherTide — SPA Orchestrator
//
// Responsibilities
// ────────────────
// • Firebase auth state → switch between Auth views and Dashboard
// • Build the dashboard shell (nav, search, geo button, unit toggle)
// • Wire every interactive element (search, geolocation, unit toggle, logout)
// • Run the weather fetch cycle: skeleton → fetch → render → theme
// • "Last search" memory: restore the previous city immediately on login
// • Toast notifications for non-blocking feedback
// • Debounced live-search on the city input
//
// Imports map
// ───────────
//   firebase/firebaseConfig  → auth
//   firebase/auth            → onAuthStateChanged, signOut
//   js/auth/authService      → loginUser, signupUser
//   js/auth/login            → renderAuthUI   (DocumentFragment)
//   js/auth/signup           → renderAuthUI   (DocumentFragment)
//   js/api/weatherApi        → fetchWeatherByCity, fetchWeatherByCoords,
//                              getCachedUnits, setCachedUnits
//   js/ui/renderWeather      → renderWeatherSkeleton, renderForecastSkeleton,
//                              renderCurrentWeather, renderForecast, renderWeatherError,
//                              normaliseForecast
//   js/ui/theme              → updateWeatherTheme, resetTheme
//   js/utils/debounce        → debounce
// ─────────────────────────────────────────────

import '../css/global.css';
import '../css/dashboard.css';

// ── Firebase ──────────────────────────────────
import { auth }                        from './firebase/firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// ── Auth ──────────────────────────────────────
import { loginUser, signupUser }        from './auth/authService.js';
import { renderAuthUI }              from '../ui/authUI.js';


// ── Weather API ───────────────────────────────
import {
  fetchWeatherByCity,
  fetchWeatherByCoords,
  fetchForecastByCity,
  fetchForecastByCoords,
  getCachedUnits,
  setCachedUnits,
} from '../js/api/weatherApi.js';

// ── Render helpers ────────────────────────────
import {
  renderWeatherSkeleton,
  renderCurrentWeather,
  renderForecastSkeleton,
  renderForecast,
  renderForecastError,
  renderWeatherError,
  normaliseForecast,
} from '../ui/renderWeather.js';

// ── Theme ─────────────────────────────────────
import { updateWeatherTheme, resetTheme } from '../ui/theme.js';

// ── Utilities ─────────────────────────────────
import { debounce } from './utils/debounce.js';

// ════════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════════

const DEFAULT_CITY  = 'Mombasa';            // shown when no lastCity is stored
const LAST_CITY_KEY = 'wt_last_city';       // localStorage key
const ALLOW_UNVERIFIED_EMAIL_IN_DEV = import.meta.env.DEV;

// ════════════════════════════════════════════════════════════
//  GLOBAL STATE
//  A plain object — no framework needed.
// ════════════════════════════════════════════════════════════

const state = {
  /** @type {'metric'|'imperial'} */
  units:       getCachedUnits(),    // persisted across sessions
  /** @type {string} */
  lastCity:    '',
  /** @type {boolean} */
  geoLoading:  false,
};

// ════════════════════════════════════════════════════════════
//  DOM HELPERS
// ════════════════════════════════════════════════════════════

/** @type {HTMLElement} */
const app = document.getElementById('app');

/**
 * Clears #app and inserts a Node or HTML string.
 * @param {Node | string} content
 */
function renderInto(content) {
  app.innerHTML = '';
  typeof content === 'string'
    ? (app.innerHTML = content)
    : app.appendChild(content);
}

/** Safely get a live element (may not exist yet). */
const $  = id => document.getElementById(id);

// ════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM
// ════════════════════════════════════════════════════════════

let _toastTimer = null;

/**
 * Shows a non-blocking toast at the bottom of the screen.
 * Auto-dismisses after `duration` ms.  Calling it again while
 * one is visible replaces the message immediately.
 *
 * @param {string}  message
 * @param {'info'|'success'|'error'|'warn'} [type='info']
 * @param {number}  [duration=3500]
 */
function showToast(message, type = 'info', duration = 3500) {
  let toast = document.getElementById('wt-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wt-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className   = `wt-toast wt-toast--${type} wt-toast--visible`;

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('wt-toast--visible');
  }, duration);
}

// ════════════════════════════════════════════════════════════
//  SPINNER  (shown while Firebase resolves the session)
// ════════════════════════════════════════════════════════════

function showSpinner() {
  renderInto(/* html */`
    <div class="splash-spinner" role="status" aria-label="Loading WeatherTide">
      <div class="splash-orb">
        <div class="splash-ripple"></div>
        <div class="splash-ripple splash-ripple--2"></div>
        <span class="splash-wave" aria-hidden="true">🌊</span>
      </div>
      <p class="splash-label">Reading the tides…</p>
    </div>
  `);
}

// ════════════════════════════════════════════════════════════
//  AUTH VIEWS
// ════════════════════════════════════════════════════════════

function showLoginView() {
  console.log('[main] showLoginView() running');
  resetTheme();
  renderInto(renderAuthUI());
  _wireLoginForm();
}

function showSignupView() {
  resetTheme();
  renderInto(renderAuthUI());
  _wireSignupForm();
}

// ── Add this AFTER showSignupView(), BEFORE _wireLoginForm() ──

// ── Verification sent screen ──────────────────
// Shown immediately after a successful signup.
// The user is already signed out at this point (done inside signupUser()).

function showVerificationSentView(email) {
  resetTheme();
  renderInto(/* html */`
    <div class="auth-scene">
      <div class="auth-bg" aria-hidden="true">
        <div class="auth-bg__orb auth-bg__orb--a"></div>
        <div class="auth-bg__orb auth-bg__orb--b"></div>
      </div>

      <div class="auth-card glass-card" role="main">
        <div class="auth-card__inner">

          <div class="verify-icon" aria-hidden="true">📧</div>

          <hgroup class="auth-hgroup">
            <h1 class="auth-heading">Check your inbox</h1>
            <p class="auth-sub">
              We sent a verification link to
              <strong class="verify-email">${_esc(email)}</strong>.
              Click the link in that email, then come back and sign in.
            </p>
          </hgroup>

          <div class="verify-steps">
            <div class="verify-step">
              <span class="verify-step__num">1</span>
              <span>Open the email from Firebase / WeatherTide</span>
            </div>
            <div class="verify-step">
              <span class="verify-step__num">2</span>
              <span>Click the verification link</span>
            </div>
            <div class="verify-step">
              <span class="verify-step__num">3</span>
              <span>Return here and sign in</span>
            </div>
          </div>

          <button id="verify-back-btn" class="btn btn-primary" style="width:100%;margin-top:1.5rem">
            Go to Sign In
          </button>

          <p class="auth-switch" style="margin-top:1rem;font-size:.8rem;opacity:.6">
            Didn't receive it? Check your spam folder. The link expires in 24 hours.
          </p>

        </div>
      </div>
    </div>
  `);

  // Wire the single button on this screen
  $('verify-back-btn')?.addEventListener('click', showLoginView);
}

// ── Login form wiring ─────────────────────────

function _wireLoginForm() {
  console.log('[main] wiring login form...');
  const form     = $('login-form');
  const errEl    = $('login-error');
  const btn      = $('login-submit-btn');
  const toSignup = $('to-signup');

  console.log('[main] login form elements:', { form: !!form, errEl: !!errEl, btn: !!btn, toSignup: !!toSignup });

  toSignup?.addEventListener('click', () => {
    console.log('[main] login→signup panel switch clicked');
    showSignupView();
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    console.log('[main] login form submitted');
    const email    = $('login-email')?.value.trim()  ?? '';
    const password = $('login-password')?.value       ?? '';

    console.log('[main] login form values extracted:', { email, passwordLength: password?.length });
    // NEW — replace the block above with this:
    _clearFieldError(errEl);
    _setButtonLoading(btn, true);

    const { user, error } = await loginUser(email, password);

    console.log('[main] loginUser result:', {
      hasUser: !!user,
      emailVerified: user?.emailVerified,
      devEmailBypass: ALLOW_UNVERIFIED_EMAIL_IN_DEV,
    });

    if (error) {
      _showFieldError(errEl, error);
      _setButtonLoading(btn, false);
      return;
    }

    // loginUser() succeeded — but we must check emailVerified
    // BEFORE onAuthStateChanged routes to the dashboard.
    if (!user.emailVerified && !ALLOW_UNVERIFIED_EMAIL_IN_DEV) {
      console.log('[main] login blocked: email is not verified; signing out');
      // Sign them back out — they don't get dashboard access yet.
      // Import signOut from firebase/auth is already at the top of main.js.
      await signOut(auth);
      _showFieldError(errEl,
        'Please verify your email before signing in. Check your inbox for the verification link.'
      );
      _setButtonLoading(btn, false);
      return;
    }

    if (!user.emailVerified && ALLOW_UNVERIFIED_EMAIL_IN_DEV) {
      console.warn('[main] DEV ONLY: allowing unverified email through login flow');
    }

    // emailVerified = true → onAuthStateChanged fires → showDashboard()
    // No action needed here.
    // Success → onAuthStateChanged fires automatically
  });
}

// ── Signup form wiring ────────────────────────

function _wireSignupForm() {
  console.log('[main] wiring signup form...');
  const form    = $('signup-form');
  const errEl   = $('signup-error');
  const btn     = $('signup-submit-btn');
  const toLogin = $('to-login');

  console.log('[main] signup form elements:', { form: !!form, errEl: !!errEl, btn: !!btn, toLogin: !!toLogin });

  toLogin?.addEventListener('click', () => {
    console.log('[main] signup→login panel switch clicked');
    showLoginView();
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    console.log('[main] signup form submitted');
    const email    = $('signup-email')?.value.trim()     ?? '';
    const password = $('signup-password')?.value          ?? '';
    const confirm  = $('signup-confirm')?.value           ?? '';

    console.log('[main] signup form values extracted:', { email, passwordLength: password?.length, confirmLength: confirm?.length });
    _clearFieldError(errEl);

    if (password !== confirm) {
      console.log('[main] password mismatch');
      _showFieldError(errEl, 'Passwords do not match.'); return;
    }
    if (password.length < 6) {
      console.log('[main] password too short');
      _showFieldError(errEl, 'Password must be at least 6 characters.'); return;
    }

    // NEW — replace the block above with this:
    _setButtonLoading(btn, true);
    const { user, error } = await signupUser(email, password);

    if (error) {
      _showFieldError(errEl, error);
      _setButtonLoading(btn, false);
      return;
    }

    showVerificationSentView(user.email);
  });
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD SHELL
// ════════════════════════════════════════════════════════════

function _buildDashboardShell(user) {
  return /* html */`
    <div class="dashboard" id="dashboard">

      <!-- ░░ STICKY NAV ░░ -->
      <header class="dash-nav glass-card" role="banner">

        <div class="dash-nav__brand" aria-label="WeatherTide">
          <span class="brand-wave" aria-hidden="true">🌊</span>
          <span class="brand-name">WeatherTide</span>
        </div>

        <!-- City search + geo button, grouped -->
        <div class="search-group">
          <form id="city-search-form" class="search-form"
                role="search" aria-label="Search for a city" novalidate>
            <div class="search-wrap">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="city-input"
                class="search-input"
                type="search"
                autocomplete="off"
                spellcheck="false"
                placeholder="City, country"
                aria-label="City name"
                aria-describedby="search-error"
                aria-autocomplete="list"
              />
              <button type="submit" class="btn btn--search" aria-label="Search">
                Search
              </button>
            </div>
            <!-- Inline error under search bar -->
            <p id="search-error" class="search-error"
               role="alert" aria-live="polite"></p>
          </form>

          <!-- Geolocation -->
          <button
            id="btn-geo"
            class="btn btn--geo"
            aria-label="Use my current location"
            title="Use my location"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            </svg>
            <span id="geo-label">My location</span>
          </button>
        </div>

        <!-- Right controls -->
        <div class="dash-nav__controls">

          <!-- °C / °F toggle -->
          <div class="unit-toggle" role="group" aria-label="Temperature unit">
            <button
              id="btn-metric"
              class="unit-btn ${state.units === 'metric' ? 'unit-btn--active' : ''}"
              data-units="metric"
              aria-pressed="${state.units === 'metric'}"
              type="button"
            >°C</button>
            <button
              id="btn-imperial"
              class="unit-btn ${state.units === 'imperial' ? 'unit-btn--active' : ''}"
              data-units="imperial"
              aria-pressed="${state.units === 'imperial'}"
              type="button"
            >°F</button>
          </div>

          <!-- User info + logout -->
          <div class="dash-user">
            <span class="dash-user__email"
                  title="${_esc(user.email)}">${_esc(user.email)}</span>
            <button id="logout-btn" class="btn btn--ghost" type="button"
                    aria-label="Sign out">Sign out</button>
          </div>

        </div>
      </header>

      <!-- ░░ WEATHER CONTENT AREA ░░ -->
      <main
        id="weather-container"
        class="dash-main"
        aria-label="Weather information"
        aria-live="polite"
        aria-atomic="false"
      >
        <!-- Populated by loadWeather() -->
        <div class="dash-empty" id="empty-state">
          <span class="dash-empty__icon" aria-hidden="true">🔭</span>
          <p class="dash-empty__text">
            Search for a city or tap <strong>My location</strong>.
          </p>
        </div>
      </main>

    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD — mount + wire all interactions
// ════════════════════════════════════════════════════════════

function showDashboard(user) {
  console.log('[main] showDashboard() running:', {
    uid: user?.uid,
    email: user?.email,
    emailVerified: user?.emailVerified,
  });
  renderInto(_buildDashboardShell(user));
  _wireDashboard(user);

  // ── Restore last search ──────────────────────────────────
  const lastCity = localStorage.getItem(LAST_CITY_KEY)?.trim();

  if (lastCity) {
    // Pre-fill the input so the user sees what's loading
    const input = $('city-input');
    if (input) input.value = lastCity;
    loadWeather({ city: lastCity, source: 'cache-restore' });
  } else {
    // No history — load the default city silently
    loadWeather({ city: DEFAULT_CITY, source: 'default' });
  }
}

// ── Wire every interactive element ───────────

function _wireDashboard(user) {
  // ── 1. City search (submit) ─────────────────
  $('city-search-form')?.addEventListener('submit', e => {
    e.preventDefault();
    debouncedSearch.cancel();          // drop any pending debounce
    const city = $('city-input')?.value.trim() ?? '';
    if (!city) {
      _showFieldError($('search-error'), 'Please enter a city name.');
      return;
    }
    _clearFieldError($('search-error'));
    loadWeather({ city });
  });

  // ── 2. Debounced live-search (input event) ──
  //    Fires the API call 450 ms after the user stops typing.
  //    The explicit submit (above) calls debounce.cancel() so
  //    there is never a double-request on Enter.
  $('city-input')?.addEventListener('input', e => {
    const val = e.target.value.trim();
    _clearFieldError($('search-error'));
    if (val.length < 2) { debouncedSearch.cancel(); return; }
    debouncedSearch(val);
  });

  // ── 3. Geolocation button ───────────────────
  $('btn-geo')?.addEventListener('click', handleGeoRequest);

  // ── 4. Unit toggle ──────────────────────────
  //    Uses event delegation on the parent so we wire once.
  document.querySelector('.unit-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('.unit-btn');
    if (!btn) return;
    const newUnits = btn.dataset.units;
    if (newUnits === state.units) return;

    // 4a. Commit to global state + persist
    state.units = newUnits;
    setCachedUnits(newUnits);

    // 4b. Sync button visuals
    _syncUnitButtons();

    // 4c. Re-fetch (cache is keyed per-units so this may be instant)
    if (state.lastCity) {
      loadWeather({ city: state.lastCity, source: 'unit-toggle' });
    }
  });

  // ── 5. Logout ───────────────────────────────
  $('logout-btn')?.addEventListener('click', async () => {
    debouncedSearch.cancel();
    state.lastCity = '';
    resetTheme();
    showToast('Signed out. See you next tide 🌊', 'info', 3000);
    await signOut(auth);
    // onAuthStateChanged fires → showLoginView()
  });
}

// ─────────────────────────────────────────────
// Debounced search — declared here so .cancel()
// is accessible in the submit handler above.
// ─────────────────────────────────────────────
const debouncedSearch = debounce((city) => {
  loadWeather({ city, source: 'debounce' });
}, 450);

// ── Unit button visual sync ───────────────────

function _syncUnitButtons() {
  ['metric', 'imperial'].forEach(u => {
    const btn    = $(`btn-${u}`);
    const active = u === state.units;
    btn?.classList.toggle('unit-btn--active', active);
    btn?.setAttribute('aria-pressed', String(active));
  });
}

// ════════════════════════════════════════════════════════════
//  GEOLOCATION
// ════════════════════════════════════════════════════════════

function handleGeoRequest() {
  if (state.geoLoading) return;

  if (!('geolocation' in navigator)) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  state.geoLoading = true;
  _setGeoButtonLoading(true);

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      state.geoLoading = false;
      _setGeoButtonLoading(false);
      await loadWeather({
        lat:    coords.latitude,
        lon:    coords.longitude,
        source: 'geolocation',
      });
    },
    (err) => {
      state.geoLoading = false;
      _setGeoButtonLoading(false);

      // Map GeolocationPositionError codes to friendly messages
      const messages = {
        1: 'Location access was denied. Enable it in your browser settings.',
        2: 'Your position could not be determined. Try again.',
        3: 'Location request timed out. Try searching by city name.',
      };
      showToast(messages[err.code] ?? 'Could not get your location.', 'error', 5000);
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
  );
}

function _setGeoButtonLoading(isLoading) {
  const btn   = $('btn-geo');
  const label = $('geo-label');
  if (!btn) return;
  btn.disabled           = isLoading;
  btn.classList.toggle('btn--geo-loading', isLoading);
  if (label) label.textContent = isLoading ? 'Locating…' : 'My location';
}

// ════════════════════════════════════════════════════════════
//  WEATHER LOAD CYCLE
//  The single function that orchestrates every weather update.
// ════════════════════════════════════════════════════════════

/**
 * Full weather pipeline:
 *   skeleton → fetch (cache-aware, timeout) → render → theme → persist
 *
 * @param {{ city?: string, lat?: number, lon?: number, source?: string }} opts
 *   Pass either `city` OR `lat`+`lon`.  `source` is for debug only.
 */
async function loadWeather({ city, lat, lon, source = 'manual' }) {
  const container = $('weather-container');
  if (!container) return;

  // ── Step 1: Show skeleton immediately ────────
  renderWeatherSkeleton(container);
  renderForecastSkeleton(container);

  try {
    // ── Step 2: Fetch (respects 30-min cache + 8s timeout) ──
    const currentPromise = city
      ? fetchWeatherByCity(city, state.units)
      : fetchWeatherByCoords(lat, lon, state.units);

    const forecastPromise = city
      ? fetchForecastByCity(city, state.units)
      : fetchForecastByCoords(lat, lon, state.units);

    const forecastPending = forecastPromise.catch(err => ({ __forecastError: err }));
    const data = await currentPromise;

    // ── Step 3: Render current conditions card ──
    renderCurrentWeather(container, data);

    // ── Step 4: Apply visual theme ───────────────
    updateWeatherTheme(data.condition, data.icon);

    // ── Step 5: Render 5-day forecast below ──────
    const forecastResult = await forecastPending;
    if (forecastResult && forecastResult.__forecastError) {
      console.warn('[main] forecast load failed:', forecastResult.__forecastError);
      renderForecastError(container, 'Forecast unavailable right now.');
    } else {
      const forecastDays = normaliseForecast(forecastResult, state.units);
      renderForecast(container, forecastDays);
    }

    // ── Step 6: Persist last city (by name) ──────
    if (data.city) {
      state.lastCity = data.city;
      localStorage.setItem(LAST_CITY_KEY, data.city);
      // Sync the search input to the resolved city name
      const input = $('city-input');
      if (input && source !== 'debounce') input.value = data.city;
    }

    // ── Step 7: Non-blocking cache hint ──────────
    if (data.fromCache) {
      showToast('📦 Showing cached data — less than 30 min old.', 'info', 4000);
    }

    console.debug(`[main] loadWeather complete — source:${source}`, data);

  } catch (err) {
    renderWeatherError(container, err.message);
    resetTheme();

    if (source !== 'default') {
      // Only show error toast for explicit user searches, not the
      // silent default-city fallback on first login
      showToast(err.message, 'error', 5000);
    }
  }
}

// ════════════════════════════════════════════════════════════
//  MICRO-UTILITIES  (form helpers, escaping)
// ════════════════════════════════════════════════════════════

function _showFieldError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function _clearFieldError(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

function _setButtonLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.dataset.orig = btn.textContent;
    btn.textContent  = btn.dataset.loadingText ?? 'Please wait…';
  } else {
    btn.textContent  = btn.dataset.orig ?? btn.textContent;
  }
}

function _esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
//  BOOTSTRAP
//  onAuthStateChanged is the ONLY router.
//  Every view transition flows through here.
// ════════════════════════════════════════════════════════════

showSpinner();   // immediate — shown before Firebase resolves the session

// NEW — replace the block above:
onAuthStateChanged(auth, async user => {
  console.log('[main] onAuthStateChanged fired:', {
    hasUser: !!user,
    uid: user?.uid,
    email: user?.email,
    emailVerified: user?.emailVerified,
    devEmailBypass: ALLOW_UNVERIFIED_EMAIL_IN_DEV,
  });

  if (!user) {
    console.log('[main] auth route: no user -> showLoginView()');
    showLoginView();
    return;
  }

  if (!user.emailVerified && !ALLOW_UNVERIFIED_EMAIL_IN_DEV) {
    console.log('[main] auth route: unverified email -> signOut() -> showLoginView()');
    await signOut(auth);
    showLoginView();
    return;
  }

  if (!user.emailVerified && ALLOW_UNVERIFIED_EMAIL_IN_DEV) {
    console.warn('[main] DEV ONLY: bypassing email verification in auth listener');
  }

  // Verified user — proceed to dashboard
  console.log('[main] auth route: allowed -> showDashboard()');
  showDashboard(user);
});
