// src/js/ui/renderWeather.js
// ─────────────────────────────────────────────
// Exports:
//   renderWeatherSkeleton(container)
//   renderCurrentWeather(container, data)
//   renderWeatherError(container, message)
//
// Card layout (redesigned):
//
//  ┌──────────────────────────────────────────┐
//  │  .current-hero                           │
//  │  ┌─ .current-hero__text ─┐ ┌─ __icon ─┐ │
//  │  │  City · Country       │ │          │ │
//  │  │  BIG TEMP °C          │ │   emoji  │ │
//  │  │  Condition · lo/hi    │ │ condition│ │
//  │  └───────────────────────┘ └──────────┘ │
//  │  .current-stats  (3 × 2 grid)           │
//  │  Feels like │ Humidity │ Wind           │
//  │  Pressure   │ Visib.   │ ☀️Rise / 🌇Set │
//  └──────────────────────────────────────────┘
//
// 6 chips (sunrise+sunset merged) → repeat(3,1fr) = perfect 2 rows
// ─────────────────────────────────────────────

// ── Constants ─────────────────────────────────

const UNIT_LABELS = {
  metric:   { temp: '°C', speed: 'm/s' },
  imperial: { temp: '°F', speed: 'mph' },
};

const ICON_EMOJI = {
  '01d': '☀️',  '01n': '🌙',
  '02d': '⛅',  '02n': '☁️',
  '03d': '☁️',  '03n': '☁️',
  '04d': '🌥️', '04n': '🌥️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️',  '11n': '⛈️',
  '13d': '❄️',  '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

// ── Helpers ───────────────────────────────────

const labels  = u  => UNIT_LABELS[u] ?? UNIT_LABELS.metric;
const emoji   = ic => ICON_EMOJI[ic] ?? '🌡️';

function cityLocalTime(unixSecs, tzOffsetSecs) {
  const utcMs   = unixSecs * 1000 + new Date().getTimezoneOffset() * 60_000;
  const localMs = utcMs + tzOffsetSecs * 1000;
  return new Date(localMs).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

function compassDir(deg) {
  const pts = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
               'S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return pts[Math.round((deg ?? 0) / 22.5) % 16];
}

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const esc = (s = '') =>
  String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── SVG icon snippets ─────────────────────────

const SVG = {
  thermometer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>`,
  droplet: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5
             c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
  </svg>`,
  wind: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2
             m10.59 11.41A2 2 0 1 0 14 16H2
             m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
  </svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
};

// ════════════════════════════════════════════════════════════
//  1 · SKELETON
// ════════════════════════════════════════════════════════════

export function renderWeatherSkeleton(container) {
  container.innerHTML = /* html */`
    <div class="weather-wrap skeleton-mode"
         aria-busy="true" aria-label="Loading weather data…">
      <div class="current-card glass-card">

        <!-- Hero skeleton -->
        <div class="current-hero">
          <div class="current-hero__text">
            <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem">
              <div class="sk" style="width:160px;height:28px;border-radius:6px"></div>
              <div class="sk" style="width:36px;height:20px;border-radius:4px"></div>
            </div>
            <div class="sk" style="width:140px;height:72px;border-radius:8px;margin-bottom:.6rem"></div>
            <div class="sk" style="width:200px;height:16px;border-radius:4px"></div>
          </div>
          <div class="current-hero__icon">
            <div class="sk sk--circle" style="width:80px;height:80px"></div>
            <div class="sk" style="width:70px;height:14px;border-radius:4px;margin-top:.5rem"></div>
          </div>
        </div>

        <!-- Stats skeleton: 6 chips -->
        <div class="current-stats">
          ${Array(6).fill(0).map(() =>
            `<div class="sk sk--stat"></div>`
          ).join('')}
        </div>

      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  2 · CURRENT WEATHER CARD
// ════════════════════════════════════════════════════════════

export function renderCurrentWeather(container, data) {
  const lbl      = labels(data.units);
  const icon     = emoji(data.icon);
  const sunrise  = cityLocalTime(data.sunrise, data.timezone);
  const sunset   = cityLocalTime(data.sunset,  data.timezone);
  const visKm    = data.visibility
    ? `${(data.visibility / 1000).toFixed(1)} km` : '—';
  const wind     = `${data.windSpeed} ${lbl.speed} ${compassDir(data.windDeg)}`;
  const condText = cap(data.description);

  // Upsert .weather-wrap
  let wrap = container.querySelector('.weather-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'weather-wrap';
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  // Upsert .current-card
  let card = wrap.querySelector('.current-card');
  if (!card) {
    card = document.createElement('div');
    wrap.insertBefore(card, wrap.firstChild);
  }
  card.className = 'current-card glass-card';
  card.setAttribute('aria-label', `Current weather in ${esc(data.city)}`);

  card.innerHTML = /* html */`

    ${data.fromCache ? `<p class="cache-badge" role="status">📦 Cached — less than 30 min old</p>` : ''}

    <!-- ── Hero: left text column + right icon column ── -->
    <div class="current-hero">

      <!-- LEFT: location → temperature → description -->
      <div class="current-hero__text">

        <div class="current-location">
          <span class="current-city">${esc(data.city)}</span>
          <span class="current-country">${esc(data.country)}</span>
        </div>

        <div class="current-temp">
          <span class="current-temp__value">${data.temperature}</span>
          <span class="current-temp__unit">${lbl.temp}</span>
        </div>

        <p class="current-desc">
          ${esc(condText)}
          <span class="current-desc__sep" aria-hidden="true">·</span>
          <span class="current-range">
            ${data.tempMin}${lbl.temp}&thinsp;/&thinsp;${data.tempMax}${lbl.temp}
          </span>
        </p>

      </div>

      <!-- RIGHT: big emoji + condition label -->
      <div class="current-hero__icon" aria-hidden="true">
        <span class="weather-emoji">${icon}</span>
        <span class="current-condition-label">${esc(condText)}</span>
      </div>

    </div>

    <!-- ── Stats grid: 6 chips → 3 × 2 ── -->
    <div class="current-stats">

      <!-- 1. Feels like -->
      <div class="stat-chip">
        ${SVG.thermometer}
        <span class="stat-chip__label">Feels like</span>
        <span class="stat-chip__value">${data.feelsLike}${lbl.temp}</span>
      </div>

      <!-- 2. Humidity -->
      <div class="stat-chip">
        ${SVG.droplet}
        <span class="stat-chip__label">Humidity</span>
        <span class="stat-chip__value">${data.humidity}%</span>
      </div>

      <!-- 3. Wind -->
      <div class="stat-chip">
        ${SVG.wind}
        <span class="stat-chip__label">Wind</span>
        <span class="stat-chip__value">${wind}</span>
      </div>

      <!-- 4. Pressure -->
      <div class="stat-chip">
        ${SVG.clock}
        <span class="stat-chip__label">Pressure</span>
        <span class="stat-chip__value">${data.pressure} hPa</span>
      </div>

      <!-- 5. Visibility -->
      <div class="stat-chip">
        ${SVG.eye}
        <span class="stat-chip__label">Visibility</span>
        <span class="stat-chip__value">${visKm}</span>
      </div>

      <!-- 6. Sunrise + Sunset (merged — eliminates orphan row) -->
      <div class="stat-chip stat-chip--sun">
        <span class="stat-chip__sun-row">
          <span aria-hidden="true">🌅</span>
          <span class="stat-chip__label">Rise</span>
          <span class="stat-chip__value">${sunrise}</span>
        </span>
        <span class="stat-chip__sun-divider" aria-hidden="true">/</span>
        <span class="stat-chip__sun-row">
          <span aria-hidden="true">🌇</span>
          <span class="stat-chip__label">Set</span>
          <span class="stat-chip__value">${sunset}</span>
        </span>
      </div>

    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  3 · ERROR STATE
// ════════════════════════════════════════════════════════════

export function renderWeatherError(container, message) {
  container.innerHTML = /* html */`
    <div class="weather-error glass-card" role="alert">
      <span class="weather-error__icon" aria-hidden="true">⚠️</span>
      <p class="weather-error__msg">${esc(message)}</p>
    </div>
  `;
}