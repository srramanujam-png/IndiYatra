import { useState, useEffect } from "react";
import { supabaseClient } from "../lib/auth";

/**
 * useRecommendations — calls the get_recommendations Supabase RPC.
 *
 * Returns { recommendations, loading, error }.
 * Each recommendation row: { lesson_id, lesson_name, module_id, course_id,
 *   theme_id, theme_title, course_name, tags, tag_overlap, total_completions }
 *
 * Usage:
 *   const { recommendations, loading } = useRecommendations({ userId, limit: 8 });
 */
export function useRecommendations({ userId, limit = 8 }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error,   setError]                   = useState(null);

  useEffect(() => {
    if (!userId) {
      setRecommendations([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabaseClient
      .rpc("get_recommendations", { p_profile_id: userId, p_limit: limit })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          // RPC may not exist yet (before migration runs) — fail gracefully
          console.warn("get_recommendations RPC:", rpcError.message);
          setError(rpcError.message);
          setRecommendations([]);
        } else {
          setRecommendations(data || []);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, limit]);

  return { recommendations, loading, error };
}
