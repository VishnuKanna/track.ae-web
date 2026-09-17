import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase, getSupabase } from "@/lib/supabase";
import { upsertProfile, isConfigMissing } from "@/lib/auth";
import { formatSupabaseError, withTimeout } from "@/lib/validation";
import type { Profile } from "@/types/database";

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignUpResult {
  /** True when Supabase requires the user to confirm their email first. */
  needsConfirmation: boolean;
}

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  configMissing: boolean;
  /** Email + password sign-in. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Email + password account creation, optionally syncing the display name. */
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  /** Sends a password reset email for the given address. */
  resetPassword: (email: string) => Promise<void>;
  /** Sets/changes the password on the current authenticated account. */
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(isConfigMissing());
  const profileFetchedFor = useRef<string | null>(null);

  /** Loads (creating if needed) the profile for a signed-in user.
   *  Always settles profile + profileError — never leaves both empty,
   *  so callers can always pick either a loaded profile or an error UI. */
  const loadProfile = useCallback(async (sb: SupabaseClient, u: User) => {
    setProfileError(null);
    try {
      const refreshed = await withTimeout(
        upsertProfile(sb, u),
        30000,
        "Profile sync"
      );
      if (refreshed) {
        setProfile(refreshed as Profile);
        return;
      }
      const { data, error } = await withTimeout(
        sb.from("profiles")
          .select("*")
          .eq("id", u.id)
          .maybeSingle(),
        30000,
        "Profile lookup"
      );
      if (error) {
        console.error("[AuthContext] profile load failed:", error);
        setProfileError(
          formatSupabaseError(error, "Could not load your profile.")
        );
        return;
      }
      if (data) {
        setProfile(data as Profile);
        return;
      }
      setProfileError("Could not load your profile.");
    } catch (err) {
      console.error("[AuthContext] profile sync failed:", err);
      setProfileError(formatSupabaseError(err, "Could not load your profile."));
    }
  }, []);

  /** Marks a user as active and (re)loads their profile. Shared by every
   *  successful sign-in path so profile creation stays consistent. */
  const activateUser = useCallback(
    async (sb: SupabaseClient, u: User) => {
      profileFetchedFor.current = u.id;
      setUser(u);
      await loadProfile(sb, u);
    },
    [loadProfile]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const sb = supabase;
    let subscription: { unsubscribe: () => void } | null = null;

    const syncUser = async (u: User | null) => {
      if (u && profileFetchedFor.current === u.id) {
        setLoading(false);
        return;
      }
      setUser(u);
      if (!u) {
        setProfile(null);
        setProfileError(null);
        profileFetchedFor.current = null;
        setLoading(false);
        return;
      }
      profileFetchedFor.current = u.id;
      await loadProfile(sb, u);
      setLoading(false);
    };

    (async () => {
      try {
        const { data } = await withTimeout(
          sb.auth.getSession(),
          30000,
          "Session restore"
        );
        await syncUser(data.session?.user ?? null);
      } catch (err) {
        console.error("[AuthContext] session restore failed:", err);
        setUser(null);
        setProfileError(
          formatSupabaseError(err, "Could not restore your session.")
        );
        setLoading(false);
      } finally {
        if (!subscription) {
          const {
            data: { subscription: sub },
          } = sb.auth.onAuthStateChange((_event, session) => {
            void syncUser(session?.user ?? null);
          });
          subscription = sub;
        }
      }
    })();

    return () => {
      subscription?.unsubscribe();
      subscription = null;
    };
  }, [loadProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (isConfigMissing()) {
        setConfigMissing(true);
        throw new Error("Track.AE isn't connected to Supabase yet.");
      }
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (data.user) await activateUser(sb, data.user);
    },
    [activateUser]
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      if (isConfigMissing()) {
        setConfigMissing(true);
        throw new Error("Track.AE isn't connected to Supabase yet.");
      }
      const sb = getSupabase();
      const { data, error } = await sb.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { full_name: input.name.trim() },
        },
      });
      if (error) throw error;
      const needsConfirmation = !data.session;
      if (data.session?.user) await activateUser(sb, data.session.user);
      return { needsConfirmation };
    },
    [activateUser]
  );

  const resetPassword = useCallback(async (email: string) => {
    if (isConfigMissing()) {
      setConfigMissing(true);
      throw new Error("Track.AE isn't connected to Supabase yet.");
    }
    const sb = getSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (isConfigMissing()) {
      setConfigMissing(true);
      throw new Error("Track.AE isn't connected to Supabase yet.");
    }
    const sb = getSupabase();
    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    if (data.user) setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setProfileError(null);
      profileFetchedFor.current = null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) return;
    profileFetchedFor.current = null;
    setLoading(true);
    try {
      await loadProfile(supabase, user);
    } finally {
      setLoading(false);
    }
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      profileError,
      loading,
      configMissing,
      signInWithEmail,
      signUp,
      resetPassword,
      updatePassword,
      logout,
      refreshProfile,
    }),
    [
      user,
      profile,
      profileError,
      loading,
      configMissing,
      signInWithEmail,
      signUp,
      resetPassword,
      updatePassword,
      logout,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}