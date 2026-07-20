// src/lib/fetchStatus.js  (Roadmap 2.8 / manual A8+B3)
// Tiny pub/sub for data-fetch failures, so an RLS/auth misconfiguration (401/
// 403) or an outage (5xx) surfaces as a visible banner instead of rendering
// as "no content". Deliberately dependency-free and side-effect-free.

const listeners = new Set();
let lastReports = [];          // ring buffer of recent failures (for debugging)

/**
 * Report a failed data fetch. Called by the REST helper (supabase.js) and
 * available to any other data layer that wants its failures surfaced.
 * @param {object} info  { source, status, table, message }
 */
export function reportFetchError(info) {
  const report = { at: Date.now(), ...info };
  lastReports = [...lastReports.slice(-19), report];
  listeners.forEach(cb => {
    try { cb(report); } catch (e) { console.warn("[fetchStatus] listener threw:", e); }
  });
}

/** Subscribe to fetch failures. Returns an unsubscribe function. */
export function onFetchError(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Recent failures (newest last) — handy in the console when debugging. */
export function getRecentFetchErrors() {
  return [...lastReports];
}

/** True when the status looks like a permissions problem (RLS regression). */
export function isAuthStatus(status) {
  return status === 401 || status === 403;
}
