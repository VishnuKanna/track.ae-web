import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Profile } from "@/types/database";

/** Single source of truth for the user's avatar image across the app.
 *  Prefers the synced profile avatar, falling back to auth metadata. */
export function getAvatarUrl(
  profile: Profile | null,
  user: User | null
): string | null {
  if (profile?.avatar_url) return profile.avatar_url;
  const meta = user?.user_metadata ?? {};
  const avatar = meta.avatar_url ?? meta.picture;
  return typeof avatar === "string" && avatar ? avatar : null;
}

/** Syncs the public profile from the authenticated user payload. */
export async function upsertProfile(sb: SupabaseClient, user: User) {
  const meta = user.user_metadata ?? {};
  const fullName =
    meta.full_name ?? meta.name ?? meta.given_name ?? null;
  const avatarUrl = meta.avatar_url ?? meta.picture ?? null;

  const { data, error } = await sb
    .from("profiles")
    .update({
      full_name: fullName,
      email: meta.email ?? user.email ?? null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    // Profile row may not exist yet (trigger lag). Insert it.
    const { data: inserted, error: insertError } = await sb
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          email: meta.email ?? user.email ?? null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();
    if (insertError) return null;
    return inserted;
  }
  return data;
}

export function isConfigMissing(): boolean {
  return !isSupabaseConfigured;
}

/** Maps Supabase auth failures to clear, user-facing copy. */
export function getAuthErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (!msg) return fallback;
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (lower.includes("password should be at least") || lower.includes("password is too short")) {
    return "Use a stronger password.";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("security restrictions") || lower.includes("reauthentication")) {
    return "For security, please log in again and retry.";
  }
  return fallback;
}