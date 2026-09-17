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

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  configMissing: boolean;
  signIn: () => Promise<void>;
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

  const signIn = useCallback(async () => {
    if (isConfigMissing()) {
      setConfigMissing(true);
      return;
    }
    await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
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
      signIn,
      logout,
      refreshProfile,
    }),
    [user, profile, profileError, loading, configMissing, signIn, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}