import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useAuth } from "@/store/AuthContext";

/**
 * Handles the return trip from Google OAuth.
 * Supabase exchanges the PKCE code automatically on client init
 * (detectSessionInUrl). This page just waits for that to finish and
 * forwards the user, reflecting any OAuth error cleanly.
 */
export function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = params.get("error") || hash.get("error");
    const desc = params.get("error_description") || hash.get("error_description");
    const code = params.get("error_code") || hash.get("error_code");
    if (err) {
      const message =
        code === "otp_expired"
          ? "This email link has expired. Sign in to request a new one."
          : desc || err;
      navigate(
        `/login?${new URLSearchParams({ error: message })}`,
        { replace: true }
      );
      return;
    }
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    } else if (!loading) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, params, navigate]);

  return <BrandLoader label="Signing you in…" />;
}