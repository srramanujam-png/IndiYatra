// ─────────────────────────────────────────────────────────────────────────────
// track() — tiny self-hosted analytics helper (Roadmap 2.6 / R3).
//
// Usage:   track("like", { contentType: "snippet", contentId: id });
//          track("quiz_complete", { contentType: "quiz", contentId: quizId,
//                                   meta: { score, max } });
//
// Design rules (R1/compliance memo):
//   - pseudonymous: profile_id only, never names/emails;
//   - no third-party trackers — events go to our own `events` table;
//   - fire-and-forget: analytics must NEVER break or slow the app, so every
//     failure is swallowed (a console.debug at most);
//   - batched: events queue locally and flush every 4 s (or 20 events, or on
//     pagehide), collapsing rapid interactions into one insert.
// ─────────────────────────────────────────────────────────────────────────────
import { supabaseClient } from "./auth";

const FLUSH_MS = 4000;
const FLUSH_AT = 20;

let queue = [];
let timer = null;

async function flush() {
  clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  try {
    const { data: { session } = {} } = await supabaseClient.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return; // no session → drop silently (RLS would reject anyway)
    const isAnon = !!session.user.is_anonymous;
    const rows = batch.map(e => ({
      profile_id:   uid,
      is_anonymous: isAnon,
      event_type:   e.type,
      content_type: e.contentType || null,
      content_id:   e.contentId != null ? String(e.contentId).slice(0, 100) : null,
      route:        e.route || null,
      meta:         e.meta || null,
    }));
    const { error } = await supabaseClient.from("events").insert(rows);
    if (error) console.debug("[track] insert failed:", error.message);
  } catch (err) {
    console.debug("[track] flush failed:", err?.message);
  }
}

/**
 * Queue an analytics event. Never throws; never blocks.
 * @param {string} type  view|like|unlike|bookmark|unbookmark|share|complete|quiz_start|quiz_complete|session_start
 * @param {object} [opts] { contentType, contentId, meta }
 */
export function track(type, { contentType, contentId, meta } = {}) {
  try {
    queue.push({
      type, contentType, contentId, meta,
      route: (window.location.hash || "#/").slice(0, 200),
    });
    if (queue.length >= FLUSH_AT) { flush(); return; }
    if (!timer) timer = setTimeout(flush, FLUSH_MS);
  } catch { /* analytics must never break the app */ }
}

// Flush what's left when the tab is hidden/closed (mobile swipe-away included).
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { flush(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
