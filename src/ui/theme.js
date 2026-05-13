// src/js/ui/theme.js
// ─────────────────────────────────────────────
// Manages the entire visual theme of the page.
//
// Primary export the rest of the app uses:
//   updateWeatherTheme(condition, iconCode)
//     — condition: OWM string e.g. 'Clear', 'Rain', 'Snow'  (WeatherData.condition)
//     — iconCode:  OWM icon   e.g. '01d', '10n'             (WeatherData.icon)
//
// Secondary exports:
//   resetTheme()              — ocean blue default (login screen, logout)
//   applyThemeById(id, icon)  — accepts numeric OWM condition ID if needed
//
// How it works
// ─────────────
// 1. A THEMES map defines gradients + accent colours for each condition.
// 2. applyTheme() writes CSS custom-properties on <html> so the
//    stylesheet's `var(--theme-gradient)` etc. animate via CSS transition.
// 3. Body classes (body.wt-clear, body.wt-rain …) are also toggled so
//    that any future CSS targeting body classes works out of the box.
// ─────────────────────────────────────────────

/** @typedef {{ gradient:string, accent:string, cardTint:string, bodyClass:string }} ThemeDef */

/** @type {Record<string, ThemeDef>} */
const THEMES = {
  // ── Thunderstorm ─────────────────────────────────────────────────────────
  thunderstorm: {
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 38%, #0f0f2a 100%)',
    accent:   '#fbbf24',
    cardTint: 'rgba(30,27,75,0.30)',
    bodyClass:'wt-thunderstorm',
  },

  // ── Drizzle ───────────────────────────────────────────────────────────────
  drizzle: {
    gradient: 'linear-gradient(160deg, #1e3a8a 0%, #1e3a5f 55%, #0f2a4a 100%)',
    accent:   '#bae6fd',
    cardTint: 'rgba(30,58,138,0.18)',
    bodyClass:'wt-drizzle',
  },

  // ── Rain ─────────────────────────────────────────────────────────────────
  rain: {
    gradient: 'linear-gradient(160deg, #164e63 0%, #1e3a5f 50%, #0c2340 100%)',
    accent:   '#67e8f9',
    cardTint: 'rgba(22,78,99,0.25)',
    bodyClass:'wt-rain',
  },

  // ── Snow ─────────────────────────────────────────────────────────────────
  snow: {
    gradient: 'linear-gradient(160deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)',
    accent:   '#1d4ed8',
    cardTint: 'rgba(224,242,254,0.32)',
    bodyClass:'wt-snow',
  },

  // ── Atmosphere (fog, mist, haze, dust, smoke, tornado…) ──────────────────
  atmosphere: {
    gradient: 'linear-gradient(160deg, #64748b 0%, #475569 50%, #334155 100%)',
    accent:   '#cbd5e1',
    cardTint: 'rgba(100,116,139,0.22)',
    bodyClass:'wt-atmosphere',
  },

  // ── Clear — day ──────────────────────────────────────────────────────────
  clear_day: {
    gradient: 'linear-gradient(160deg, #0ea5e9 0%, #0284c7 42%, #0369a1 100%)',
    accent:   '#fde68a',
    cardTint: 'rgba(14,165,233,0.16)',
    bodyClass:'wt-clear',
  },

  // ── Clear — night ─────────────────────────────────────────────────────────
  clear_night: {
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 52%, #0c2340 100%)',
    accent:   '#7dd3fc',
    cardTint: 'rgba(15,23,42,0.28)',
    bodyClass:'wt-clear-night',
  },

  // ── Clouds — few / scattered (801-802) ────────────────────────────────────
  clouds_few: {
    gradient: 'linear-gradient(160deg, #38bdf8 0%, #0284c7 52%, #075985 100%)',
    accent:   '#e0f2fe',
    cardTint: 'rgba(56,189,248,0.14)',
    bodyClass:'wt-clouds-few',
  },

  // ── Clouds — broken / overcast (803-804) ──────────────────────────────────
  clouds_broken: {
    gradient: 'linear-gradient(160deg, #475569 0%, #334155 52%, #1e293b 100%)',
    accent:   '#94a3b8',
    cardTint: 'rgba(71,85,105,0.22)',
    bodyClass:'wt-clouds',
  },

  // ── Default / ocean ────────────────────────────────────────────────────────
  default: {
    gradient: 'linear-gradient(160deg, #0369a1 0%, #075985 52%, #0c4a6e 100%)',
    accent:   '#7dd3fc',
    cardTint: 'rgba(3,105,161,0.18)',
    bodyClass:'wt-default',
  },
};

// All body-class names — kept in one place so we can remove them all cleanly.
const ALL_BODY_CLASSES = Object.values(THEMES).map(t => t.bodyClass);

// ── Internal apply ────────────────────────────

/**
 * Writes theme CSS custom-properties onto <html> and toggles the matching
 * body class.  Everything else (gradients, glass tints, accent colours)
 * flows from these three vars that the stylesheet already consumes.
 * @param {ThemeDef} theme
 */
function _applyTheme(theme) {
  // 1. CSS custom-properties on <html>  ← stylesheet transition picks this up
  const root = document.documentElement.style;
  root.setProperty('--theme-gradient',  theme.gradient);
  root.setProperty('--theme-accent',    theme.accent);
  root.setProperty('--theme-card-tint', theme.cardTint);

  // 2. data-theme attribute (useful for CSS attribute selectors / debugging)
  document.documentElement.dataset.theme = theme.bodyClass;

  // 3. Toggle a single body class  (one-class-at-a-time swap)
  document.body.classList.remove(...ALL_BODY_CLASSES);
  document.body.classList.add(theme.bodyClass);
}

// ── Condition string → ThemeDef ───────────────

/**
 * Maps an OWM condition string + icon code to the right ThemeDef.
 *
 * OWM condition strings (WeatherData.condition):
 *   Thunderstorm | Drizzle | Rain | Snow | Mist | Smoke | Haze
 *   Dust | Fog | Sand | Ash | Squall | Tornado | Clear | Clouds
 *
 * @param {string} condition  — e.g. 'Clear', 'Rain'
 * @param {string} iconCode   — e.g. '01d', '10n'
 * @returns {ThemeDef}
 */
function resolveByCondition(condition, iconCode = '01d') {
  const isNight = iconCode.endsWith('n');
  const c       = (condition ?? '').toLowerCase();

  if (c === 'thunderstorm')                         return THEMES.thunderstorm;
  if (c === 'drizzle')                              return THEMES.drizzle;
  if (c === 'rain')                                 return THEMES.rain;
  if (c === 'snow')                                 return THEMES.snow;

  // All "atmosphere" group conditions (700–799)
  if (['mist','smoke','haze','dust','fog',
       'sand','ash','squall','tornado'].includes(c)) return THEMES.atmosphere;

  if (c === 'clear')  return isNight ? THEMES.clear_night : THEMES.clear_day;

  if (c === 'clouds') {
    // Distinguish light cloud (few/scattered) from heavy overcast
    // by reading the icon number: 02 = few, 03 = scattered, 04 = broken/overcast
    const iconNum = parseInt(iconCode.slice(0, 2), 10);
    return (iconNum <= 3) ? THEMES.clouds_few : THEMES.clouds_broken;
  }

  return THEMES.default;
}

/**
 * Maps a numeric OWM condition ID + icon code to the right ThemeDef.
 * (Kept for any code that still has the raw OWM JSON.)
 * @param {number} id
 * @param {string} iconCode
 * @returns {ThemeDef}
 */
function resolveById(id, iconCode = '01d') {
  const isNight = iconCode.endsWith('n');

  if (id >= 200 && id < 300) return THEMES.thunderstorm;
  if (id >= 300 && id < 400) return THEMES.drizzle;
  if (id >= 500 && id < 600) return THEMES.rain;
  if (id >= 600 && id < 700) return THEMES.snow;
  if (id >= 700 && id < 800) return THEMES.atmosphere;
  if (id === 800)             return isNight ? THEMES.clear_night : THEMES.clear_day;
  if (id === 801 || id === 802) return THEMES.clouds_few;
  if (id >= 803)              return THEMES.clouds_broken;

  return THEMES.default;
}

// ── Public API ────────────────────────────────

/**
 * PRIMARY function — call this after every successful weather fetch.
 *
 * @param {string} condition  — WeatherData.condition  e.g. 'Clear'
 * @param {string} [iconCode] — WeatherData.icon       e.g. '01d'
 *
 * @example
 *   updateWeatherTheme(data.condition, data.icon);
 */
export function updateWeatherTheme(condition, iconCode = '01d') {
  const theme = resolveByCondition(condition, iconCode);
  _applyTheme(theme);
  console.debug(`[theme] ${condition}/${iconCode} → body.${theme.bodyClass}`);
}

/**
 * Accepts a numeric OWM condition ID when you have the raw API response.
 *
 * @param {number} id         — e.g. 800, 501, 211
 * @param {string} [iconCode] — e.g. '01d'
 */
export function applyThemeById(id, iconCode = '01d') {
  const theme = resolveById(id, iconCode);
  _applyTheme(theme);
  console.debug(`[theme] id:${id}/${iconCode} → body.${theme.bodyClass}`);
}

/**
 * Resets to the ocean-blue default.
 * Call on logout or before the first weather load.
 */
export function resetTheme() {
  _applyTheme(THEMES.default);
}

/**
 * Convenience: derive theme directly from a WeatherData object
 * (the shape returned by fetchWeatherByCity / fetchWeatherByCoords).
 *
 * @param {{ condition: string, icon: string }} weatherData
 */
export function applyThemeFromData(weatherData) {
  updateWeatherTheme(weatherData?.condition ?? 'Clear', weatherData?.icon ?? '01d');
}