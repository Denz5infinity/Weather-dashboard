// src/js/utils/debounce.js
// ─────────────────────────────────────────────
// A minimal, zero-dependency debounce utility.
//
// Usage:
//   import { debounce } from './utils/debounce.js';
//
//   const onInput = debounce((value) => searchCity(value), 400);
//   input.addEventListener('input', e => onInput(e.target.value));
//
// cancel() — call to discard any pending invocation (e.g. on unmount).
// flush()  — call to fire immediately without waiting for the delay.
// ─────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` that delays invocation
 * until `delay` ms have elapsed since the last call.
 *
 * The returned function carries two helper methods:
 *   .cancel()  — cancels the pending call (no-op if none)
 *   .flush(...args) — fires immediately and resets the timer
 *
 * @template {(...args: any[]) => any} T
 * @param {T}      fn     — the function to debounce
 * @param {number} delay  — quiet period in milliseconds (default: 350)
 * @returns {T & { cancel(): void; flush(...args: Parameters<T>): void }}
 */
export function debounce(fn, delay = 350) {
  let timer = null;

  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  }

  /** Discard any pending invocation. */
  debounced.cancel = function () {
    clearTimeout(timer);
    timer = null;
  };

  /**
   * Fire immediately (bypassing the delay) and reset the timer.
   * Useful for submit-on-Enter while an input debounce is active.
   */
  debounced.flush = function (...args) {
    clearTimeout(timer);
    timer = null;
    fn.apply(this, args);
  };

  return debounced;
}