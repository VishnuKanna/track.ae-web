import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/store/AuthContext";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <span className="google-g" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3C33.5 32.7 29.1 35.5 24 35.5c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 5.7 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20c11.5 0 19-8.1 19-19.5 0-1.3-.1-2.6-.4-4z"/>
        <path fill="#34A853" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 5.7 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#FBBC05" d="M24 44c5.2 0 9.9-1.9 13.4-5L31 34.9c-1.9 1.3-4.4 2.1-7 2.1-5.1 0-9.4-3.1-11.1-7.5l-6.4 5C10.2 39.4 16.6 44 24 44z"/>
        <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.3 5.8l6.4 5C41.9 36.4 44 32.4 44 27.5c0-2.4-.2-4.6-.4-7z"/>
      </svg>
    </span>
  );
}

export function Login() {
  const { signIn, configMissing, loading, user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const [busy, setBusy] = useState(false);
  const error = params.get("error") || params.get("error_description");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const go = async () => {
    setBusy(true);
    try {
      await signIn();
    } catch {
      setBusy(false);
      setParams({ error: "Could not start Google sign-in. Please try again." });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-grid" aria-hidden />
      <div className="auth-glow" aria-hidden />

      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="auth-brand">
            TRACK.AE<span className="brand-dot" />
          </Link>

          <h1 className="auth-title">
            {mode === "signup" ? "Start tracking your next move." : "Welcome back."}
          </h1>
          <p className="auth-sub">
            {mode === "signup"
              ? "Create your account and build your career pipeline in minutes."
              : "Sign in to your command center."}
          </p>

          {configMissing ? (
            <div className="auth-setup-warn">
              <AlertTriangle size={18} />
              <p>
                Track.AE isn't connected to Supabase yet. Copy <code>.env.example</code> to{" "}
                <code>.env.local</code> and add your Supabase URL and anon key, then restart.
              </p>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-lg btn-block auth-google-btn"
              onClick={go}
              disabled={busy || loading}
            >
              <GoogleIcon />
              {busy ? "Signing in…" : mode === "signup" ? "Sign up with Google" : "Continue with Google"}
            </button>
          )}

          {error && (
            <motion.p
              className="auth-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
            >
              {error === "access_denied"
                ? "Sign-in was cancelled."
                : typeof error === "string" && error.length > 0 && error.length < 180
                ? error
                : "Google sign-in was cancelled or failed. Please try again."}
            </motion.p>
          )}

          <p className="auth-legal faint">
            By continuing you agree to use Track.AE for personal career tracking. Only your
            Google profile name, email, and avatar are used.
          </p>

          <Link to="/" className="auth-back">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}