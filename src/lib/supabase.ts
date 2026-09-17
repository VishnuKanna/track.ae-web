import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The Supabase client is intentionally untyped: every query result in the
 * data layer is explicitly cast to the row interfaces in `@/types/database`.
 * This keeps the store resilient across supabase-js versions whose generic
 * schema inference changes between releases.
 */
function create(): SupabaseClient | null {
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

export type AppSupabaseClient = SupabaseClient;

export const supabase: AppSupabaseClient | null = create();

/** Returns the client or throws a friendly, safe error. */
export function getSupabase(): AppSupabaseClient {
  if (!supabase) {
    throw new Error(
      "Track.AE is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment."
    );
  }
  return supabase;
}

export const isSupabaseConfigured = supabase !== null;