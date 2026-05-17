// src/js/api/weatherApi.js
// ─────────────────────────────────────────────
// OpenWeatherMap data layer.
//
// Exports:
//   fetchWeatherByCity(city, units)        — search by name
//   fetchWeatherByCoords(lat, lon, units)  — search by GPS
//   getCachedUnits()                        — read persisted unit preference
//   setCachedUnits(units)                   — persist unit preference
//
// Both fetch functions:
//   • Return a normalised WeatherData object (same shape regardless of source)
//   • Check a 30-minute localStorage cache before hitting the network
//   • Reject after 8 seconds via AbortController
//   • Throw user-friendly Error messages; never return null
// ─────────────────────────────────────────────

const API_KEY      = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL     = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const CACHE_TTL    = 30 * 60 * 1000;   // 30 minutes in ms
const TIMEOUT_MS   = 8_000;             // 8 seconds
const UNITS_KEY    = 'wt_units';        // localStorage key for unit preference
const CACHE_PREFIX = 'wt_wx_';         // localStorage key prefix for weather cache

// ── Unit helpers ──────────────────────────────

/**
 * Reads the user's last-chosen unit from localStorage.
 * Defaults to 'metric'.
 * @returns {'metric' | 'imperial'}
 */
export function getCachedUnits() {
  const stored = localStorage.getItem(UNITS_KEY);
  return stored === 'imperial' ? 'imperial' : 'metric';
}

/**
 * Persists the user's unit choice to localStorage.
 * @param {'metric' | 'imperial'} units
 */
export function setCachedUnits(units) {
  localStorage.setItem(UNITS_KEY, units);
}

// ── Cache helpers ─────────────────────────────

/**
 * Builds a safe localStorage key.
 * City keys:   "wt_wx_city:london:metric"
 * Coord keys:  "wt_wx_coords:51.50:-0.12:imperial"
 *              (coords truncated to 2 d.p. — ~1 km precision, avoids
 *               cache misses from GPS jitter on the same location)
 */
function makeCacheKey(type, identifier, units) {
  return `${CACHE_PREFIX}${type}:${identifier}:${units}`;
}

/**
 * Reads a cache entry. Returns the stored WeatherData or null if
 * the entry is absent, malformed, or older than CACHE_TTL.
 * @param {string} key
 * @returns {WeatherData | null}
 */
function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;               // WeatherData
  } catch {
    return null;               // corrupted entry → treat as miss
  }
}

/**
 * Writes a WeatherData object into the cache.
 * Fails silently (private browsing / quota exceeded).
 * @param {string}      key
 * @param {WeatherData} data
 */
function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (err) {
    console.warn('[weatherApi] Cache write skipped:', err.message);
  }
}

// ── Network layer ─────────────────────────────

/**
 * fetch() wrapper that rejects with a friendly Error after `ms` ms.
 * @param {string} url
 * @param {number} [ms=TIMEOUT_MS]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, ms = TIMEOUT_MS) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Request timed out (8 s). Check your connection and try again.'
      );
    }
    throw new Error('Network error. Are you connected to the internet?');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses an OWM error response and returns a readable message.
 * @param {Response} res
 * @param {string}   context — city name or "your location"
 */
async function owmError(res, context) {
  const body = await res.json().catch(() => ({}));
  switch (res.status) {
    case 401: return 'Invalid API key — check VITE_OPENWEATHER_API_KEY in your .env file.';
    case 404: return `"${context}" not found. Try a different city name or spelling.`;
    case 429: return 'Too many requests. Wait a moment and try again.';
    default:  return body.message ?? `Weather service error (HTTP ${res.status}).`;
  }
}

// ── Data normaliser ───────────────────────────

/**
 * @typedef {Object} WeatherData
 * @property {string}            city
 * @property {string}            country
 * @property {number}            temperature
 * @property {number}            feelsLike
 * @property {number}            tempMin
 * @property {number}            tempMax
 * @property {number}            humidity
 * @property {number}            windSpeed
 * @property {number}            windDeg        — degrees 0–360
 * @property {number}            pressure       — hPa
 * @property {number}            visibility     — metres
 * @property {string}            condition      — e.g. "Clear", "Rain"
 * @property {string}            description    — e.g. "light rain"
 * @property {string}            icon           — OWM icon code, e.g. "10d"
 * @property {number}            sunrise        — Unix seconds (UTC)
 * @property {number}            sunset         — Unix seconds (UTC)
 * @property {number}            timezone       — UTC offset in seconds
 * @property {'metric'|'imperial'} units
 * @property {boolean}           fromCache
 */

/**
 * Converts a raw OWM /weather JSON response into a WeatherData object.
 * @param {object}               raw
 * @param {'metric'|'imperial'}  units
 * @param {boolean}              fromCache
 * @returns {WeatherData}
 */
function normalise(raw, units, fromCache = false) {
  return {
    city:        raw.name,
    country:     raw.sys.country,
    temperature: Math.round(raw.main.temp),
    feelsLike:   Math.round(raw.main.feels_like),
    tempMin:     Math.round(raw.main.temp_min),
    tempMax:     Math.round(raw.main.temp_max),
    humidity:    raw.main.humidity,
    windSpeed:   raw.wind.speed,
    windDeg:     raw.wind.deg ?? 0,
    pressure:    raw.main.pressure,
    visibility:  raw.visibility ?? 0,
    condition:   raw.weather[0].main,
    description: raw.weather[0].description,
    icon:        raw.weather[0].icon,
    sunrise:     raw.sys.sunrise,
    sunset:      raw.sys.sunset,
    timezone:    raw.timezone,
    units,
    fromCache,
  };
}

// ── Public API ────────────────────────────────

/**
 * Fetches current weather for a city name.
 * Returns cached data if a valid entry exists (< 30 min old).
 *
 * @param {string}               city
 * @param {'metric'|'imperial'}  [units]
 * @returns {Promise<WeatherData>}
 * @throws {Error} with a user-readable .message
 */
export async function fetchWeatherByCity(city, units = getCachedUnits()) {
  if (!API_KEY) {
    throw new Error('Weather API key missing — add VITE_OPENWEATHER_API_KEY to .env');
  }
  const trimmed = city?.trim();
  if (!trimmed) throw new Error('Please enter a city name.');

  const cacheKey = makeCacheKey('city', trimmed.toLowerCase(), units);
  const cached   = readCache(cacheKey);
  if (cached) {
    console.debug('[weatherApi] cache hit:', cacheKey);
    return { ...cached, fromCache: true };
  }

  const url = `${BASE_URL}?q=${encodeURIComponent(trimmed)}&appid=${API_KEY}&units=${units}`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) throw new Error(await owmError(res, trimmed));

  const raw  = await res.json();
  const data = normalise(raw, units, false);
  writeCache(cacheKey, data);
  return data;
}

/**
 * Fetches current weather for a pair of GPS coordinates.
 * Coordinates are rounded to 2 decimal places for cache keying
 * (~1 km grid), preventing excessive misses from GPS jitter.
 *
 * @param {number}               lat
 * @param {number}               lon
 * @param {'metric'|'imperial'}  [units]
 * @returns {Promise<WeatherData>}
 * @throws {Error} with a user-readable .message
 */
export async function fetchWeatherByCoords(lat, lon, units = getCachedUnits()) {
  if (!API_KEY) {
    throw new Error('Weather API key missing — add VITE_OPENWEATHER_API_KEY to .env');
  }
  if (lat == null || lon == null) {
    throw new Error('Invalid coordinates received from geolocation.');
  }

  // Round to 2 d.p. for stable cache keys
  const rLat = parseFloat(lat.toFixed(2));
  const rLon = parseFloat(lon.toFixed(2));

  const cacheKey = makeCacheKey('coords', `${rLat}:${rLon}`, units);
  const cached   = readCache(cacheKey);
  if (cached) {
    console.debug('[weatherApi] cache hit:', cacheKey);
    return { ...cached, fromCache: true };
  }

  const url = `${BASE_URL}?lat=${rLat}&lon=${rLon}&appid=${API_KEY}&units=${units}`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) throw new Error(await owmError(res, 'your location'));

  const raw  = await res.json();
  const data = normalise(raw, units, false);
  writeCache(cacheKey, data);
  return data;
}

async function fetchForecast(url, cacheKey, context) {
  const cached = readCache(cacheKey);
  if (cached) {
    console.debug('[weatherApi] forecast cache hit:', cacheKey);
    return cached;
  }

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(await owmError(res, context));

  const raw = await res.json();
  writeCache(cacheKey, raw);
  return raw;
}

/**
 * Fetches 5-day forecast for a city name.
 * @param {string}               city
 * @param {'metric'|'imperial'}  [units]
 * @returns {Promise<object>}   Raw OWM /forecast response
 */
export async function fetchForecastByCity(city, units = getCachedUnits()) {
  if (!API_KEY) {
    throw new Error('Weather API key missing — add VITE_OPENWEATHER_API_KEY to .env');
  }

  const trimmed = city?.trim();
  if (!trimmed) throw new Error('Please enter a city name.');

  const cacheKey = makeCacheKey('forecast-city', trimmed.toLowerCase(), units);
  const url = `${FORECAST_URL}?q=${encodeURIComponent(trimmed)}&appid=${API_KEY}&units=${units}`;
  return fetchForecast(url, cacheKey, trimmed);
}

/**
 * Fetches 5-day forecast for GPS coordinates.
 * @param {number}               lat
 * @param {number}               lon
 * @param {'metric'|'imperial'}  [units]
 * @returns {Promise<object>}   Raw OWM /forecast response
 */
export async function fetchForecastByCoords(lat, lon, units = getCachedUnits()) {
  if (!API_KEY) {
    throw new Error('Weather API key missing — add VITE_OPENWEATHER_API_KEY to .env');
  }
  if (lat == null || lon == null) {
    throw new Error('Invalid coordinates received from geolocation.');
  }

  const rLat = parseFloat(lat.toFixed(2));
  const rLon = parseFloat(lon.toFixed(2));
  const cacheKey = makeCacheKey('forecast-coords', `${rLat}:${rLon}`, units);
  const url = `${FORECAST_URL}?lat=${rLat}&lon=${rLon}&appid=${API_KEY}&units=${units}`;
  return fetchForecast(url, cacheKey, 'your location');
}

