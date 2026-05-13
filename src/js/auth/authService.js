// src/auth/authService.js
// ─────────────────────────────────────────────
// Thin wrapper around Firebase Auth.
// Always resolves (never throws) — returns { user, error }.
// ─────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

// ── Public API ────────────────────────────────

/**
 * Sign in an existing user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: import('firebase/auth').User | null, error: string | null }>}
 */
export async function loginUser(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err) {
    console.error('[authService] loginUser:', err.code, err.message);
    return { user: null, error: friendlyMessage(err) };
  }
}

/**
 * Create a new user account with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: import('firebase/auth').User | null, error: string | null }>}
 */
export async function signupUser(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err) {
    console.error('[authService] signupUser:', err.code, err.message);
    return { user: null, error: friendlyMessage(err) };
  }
}