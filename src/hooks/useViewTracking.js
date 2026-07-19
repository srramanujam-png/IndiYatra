import { useEffect, useRef } from "react";
import { supabaseClient } from "../lib/auth";

/**
 * useViewTracking — tracks active reading time in SnippetPlayer.
 *
 * "Active" = tab is visible. Timer pauses on visibilitychange (tab switch,
 * screen lock, app switcher on mobile). Saves on:
 *   - component unmount (normal navigation away)
 *   - pagehide event (mobile browser kill / swipe close)
 *
 * Only writes to lesson_views if the user actively read for > 5 seconds
 * (filters out accidental taps that open and immediately close a lesson).
 *
 * Usage — add to SnippetPlayer.jsx:
 *   useViewTracking({ userId: user?.id, lessonId: lesson?.lesson_id, enabled: !playlistMode });
 */
export function useViewTracking({ userId, lessonId, enabled = true }) {
  const activeSecondsRef = useRef(0);
  const intervalRef      = useRef(null);

  useEffect(() => {
    // Only track authenticated users in lesson (not playlist) mode
    if (!enabled || !userId || !lessonId) return;

    // ── Timer helpers ──────────────────────────────────────────────────────────
    function startTimer() {
      if (intervalRef.current) return;          // already running
      intervalRef.current = setInterval(() => {
        activeSecondsRef.current += 1;
      }, 1000);
    }

    function pauseTimer() {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // ── Save helper ────────────────────────────────────────────────────────────
    async function save() {
      const secs = activeSecondsRef.current;
      if (secs <= 5) return;                    // ignore accidental opens

      try {
        await supabaseClient
          .from("lesson_views")
          .upsert(
            {
              profile_id:     userId,
              lesson_id:      lessonId,
              last_seen_at:   new Date().toISOString(),
              active_seconds: secs,
              view_count:     1,                // DB trigger/default handles increment
            },
            {
              onConflict: "profile_id,lesson_id",
              // On conflict: add new seconds to existing tally, bump last_seen + view_count
              // (Supabase upsert replaces the row; use a DB trigger for true additive behaviour,
              //  or accept that this replaces active_seconds with the session total — either is
              //  fine for recommendation scoring purposes.)
            }
          );
      } catch (e) {
        // Fire-and-forget — never block navigation
        console.warn("useViewTracking save failed:", e.message);
      }
    }

    // ── Visibility change (tab switch / screen lock / app switcher) ────────────
    function handleVisibility() {
      if (document.hidden) {
        pauseTimer();
      } else {
        startTimer();
      }
    }

    // ── pagehide — fires when mobile browser kills the page ───────────────────
    // Do NOT await here; the browser won't wait for async calls on pagehide.
    // Use sendBeacon if you later need guaranteed delivery (requires a server endpoint).
    function handlePageHide() {
      pauseTimer();
      save();                                   // async, best-effort
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    activeSecondsRef.current = 0;              // reset for this lesson
    startTimer();                              // begin immediately (tab is visible on mount)

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      pauseTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      save();                                  // save on normal unmount
    };
    // Re-run if lessonId changes (user hits "Next Lesson" without unmounting player)
  }, [userId, lessonId, enabled]);
}
