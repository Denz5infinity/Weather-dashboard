// src/firebase/firebaseConfig.js
// ─────────────────────────────────────────────
// Firebase initialisation — reads from Vite's import.meta.env
// All keys must be declared in your .env file with the VITE_ prefix.
// ─────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';

// Vite exposes only VITE_-prefixed variables to client bundles.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Guard: fail fast if any required variable is missing ──
const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missing = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);
if (missing.length > 0) {
  throw new Error(
    `[firebaseConfig] Missing environment variable(s): ${missing
      .map((k) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
      .join(', ')}\n` +
      'Check your .env file and restart the dev server.'
  );
}

// ── Initialise ────────────────────────────────
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export default app;