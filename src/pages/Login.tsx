import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  AuthConfigWarning,
  AuthErrorBox,
  AuthShell,
  AuthSuccessBox,
} from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  isBlank,
  validateAuthEmail,
  type ValidationErrors,
} from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth";

export function Login() {
  const { user, loading, configMissing, signIn, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const oauthError = params.get("error") || params.get("error_description");
  const justConfirmed = params.get("confirmed") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors: ValidationErrors = {};
    const emailError = validateAuthEmail(email);
    if (emailError) errors.email = emailError;
    if (isBlank(password)) errors.password = "Password is required.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setBusy("email");
    try {
      await signInWithEmail(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(getAuthErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const goGoogle = async () => {
    setServerError(null);
    setBusy("google");
    try {
      await signIn();
    } catch {
      setBusy(null);
      setServerError("Could not start Google sign-in. Please try again.");
    }
  };

  const disabled = busy !== null;

  return (
    <AuthShell>
      <h1 className="auth-title">Welcome back.</h1>
      <p className="auth-sub">Sign in with your email and password.</p>

      {oauthError && (
        <AuthErrorBox>
          {oauthError === "access_denied"
            ? "Sign-in was cancelled."
            : typeof oauthError === "string" && oauthError.length > 0 && oauthError.length < 180
            ? oauthError
            : "Sign-in was cancelled or failed. Please try again."}
        </AuthErrorBox>
      )}

      {justConfirmed && (
        <AuthSuccessBox>Email confirmed — sign in to continue.</AuthSuccessBox>
      )}

      {configMissing ? (
        <AuthConfigWarning />
      ) : (
        <>
          {serverError && <AuthErrorBox>{serverError}</AuthErrorBox>}

          <form className="auth-form" onSubmit={submit} noValidate>
            <Field label="Email" htmlFor="login-email" error={fieldErrors.email} required>
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!fieldErrors.email}
                disabled={disabled}
              />
            </Field>

            <PasswordField
              id="login-password"
              label="Password"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              autoComplete="current-password"
              disabled={disabled}
            />

            <div className="auth-row">
              <Link to="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="block"
              className="btn-lg"
              loading={busy === "email"}
              loadingLabel="Signing in…"
              disabled={disabled}
            >
              Log in
            </Button>
          </form>

          <div className="auth-or" aria-hidden>
            <span>or</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-lg btn-block auth-google-btn"
            onClick={goGoogle}
            disabled={disabled}
          >
            {busy === "google" ? (
              <span className="btn-spinner" aria-hidden />
            ) : (
              <GoogleIcon />
            )}
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </button>

          <p className="auth-switch">
            New to Track.AE?{" "}
            <Link to="/signup" className="auth-link">
              Create an account
            </Link>
          </p>
        </>
      )}

      <p className="auth-legal faint">
        Sign in with the email and password you used to create your Track.AE account.
        We never ask for or store your Google account password.
      </p>
    </AuthShell>
  );
}

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
