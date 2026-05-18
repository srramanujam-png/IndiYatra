import { useState, useEffect } from "react";
import { supabaseClient, getProfile } from "../lib/auth";

export function useAuth() {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Separate async function — called fire-and-forget so the
  // onAuthStateChange callback stays synchronous (releases the
  // Supabase v2 auth-state-machine lock immediately).
  async function loadProfile(userId) {
    const { data } = await getProfile(userId);
    setProfile(data ?? null);
  }

  async function refreshProfile() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) await loadProfile(session.user.id);
  }

  useEffect(() => {
    // onAuthStateChange is the single source of truth.
    // IMPORTANT: callback must be synchronous — do NOT await inside it.
    // Supabase v2 holds a lock while the callback runs; an async callback
    // blocks all subsequent supabaseClient calls (causes modal freeze, etc).
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        setAuthLoading(false);
        if (u) {
          loadProfile(u.id); // fire-and-forget — does NOT block the lock
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, authLoading, refreshProfile };
}
