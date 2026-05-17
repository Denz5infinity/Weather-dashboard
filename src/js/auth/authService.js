// src/auth/authService.js
// ─────────────────────────────────────────────
// Thin wrapper around Firebase Auth.
// Always resolves (never throws) — returns { user, error }.
// ─────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig.js';

// ── Error code → human-readable message ──────
// Full list: https://firebase.google.com/docs/auth/admin/errors
const ERROR_MESSAGES = {
  // Login
  'auth/user-not-found':        'No account found with that email.',
  'auth/wrong-password':        'Incorrect password. Please try again.',
  'auth/invalid-credential':    'Invalid credentials. Check your email and password.',
  'auth/invalid-email':         'That doesn\'t look like a valid email address.',
  'auth/user-disabled':         'This account has been disabled. Contact support.',
  'auth/too-many-requests':     'Too many attempts. Please wait a moment and try again.',

  // Signup
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/weak-password':         'Password must be at least 6 characters.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase.',

  // Network / generic
  'auth/network-request-failed':'Network error. Check your connection and retry.',
};

/**
 * Returns a friendly error message for a Firebase Auth error.
 * Falls back to the raw Firebase message if the code is unknown.
 * @param {import('firebase/auth').AuthError} err
 * @returns {string}
 */
function friendlyMessage(err) {
  return ERROR_MESSAGES[err.code] ?? err.message ?? 'Something went wrong. Please try again.';
}

// ── Add this block AFTER friendlyMessage(), BEFORE loginUser() ──

/**
 * Sends a Firebase verification email to the currently signed-in user.
 * Call this immediately after signupUser() succeeds.
 *
 * @param {import('firebase/auth').User} user — the user object from signupUser()
 * @returns {Promise<{ sent: boolean, error: string | null }>}
 */
export async function sendVerificationEmail(user) {
  try {
    await sendEmailVerification(user);
    return { sent: true, error: null };
  } catch (err) {
    console.error('[authService] sendVerificationEmail:', err.code, err.message);
    // Don't expose raw Firebase errors — user just needs to know it failed
    return { sent: false, error: 'Could not send verification email. Try again later.' };
  }
}

// ── Public API ────────────────────────────────

/**
 * Sign in an existing user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: import('firebase/auth').User | null, error: string | null }>}
 */
export async function loginUser(email, password) {
  console.log('[authService] loginUser called with:', { email, passwordLength: password?.length });
  try {
    console.log('[authService] calling signInWithEmailAndPassword...');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[authService] SUCCESS — user logged in:', credential.user.uid);
    return { user: credential.user, error: null };
  } catch (err) {
    console.error('[authService] FAILED:', {
      code: err.code,
      message: err.message,
      customData: err.customData,
      stack: err.stack,
    });
    return { user: null, error: friendlyMessage(err) };
  }
}

/**
 * Create a new user account with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: import('firebase/auth').User | null, error: string | null }>}
 */
// NEW signupUser — replace the block above entirely:
export async function signupUser(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Send verification email BEFORE signing out.
    // We do it here because the user object is freshly created and
    // still authenticated — sendEmailVerification requires an active session.
    await sendEmailVerification(credential.user);

    // Sign out immediately so the unverified user cannot reach the dashboard.
    // onAuthStateChanged will fire with null → showLoginView() runs.
    // The verification screen is shown by _wireSignupForm() in main.js
    // (see Step 5) before this sign-out completes.
    await signOut(auth);

    // Return the user so main.js knows signup succeeded and can show
    // the "check your email" message.
    return { user: credential.user, error: null };
  } catch (err) {
    console.error('[authService] signupUser:', err.code, err.message);
    return { user: null, error: friendlyMessage(err) };
  }
}