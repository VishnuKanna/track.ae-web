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
    const err = params.get("error");
    const desc = params.get("error_description");
    if (err) {
      navigate(
        `/login?${new URLSearchParams({
          error: desc || err,
        })}`,
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