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
} from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  isBlank,
  validateAuthEmail,
  type ValidationErrors,
} from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth";

export function Login() {
  const { user, loading, configMissing, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

    setBusy(true);
    try {
      await signInWithEmail(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(
        getAuthErrorMessage(err, "Email or password is incorrect.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="auth-title">Welcome back.</h1>
      <p className="auth-sub">Sign in with your email and password.</p>

      {linkError && (
        <AuthErrorBox>
          That email link is invalid or has expired. Please try again.
        </AuthErrorBox>
      )}

      {configMissing ? (
        <AuthConfigWarning />
      ) : (
        <>
          {serverError && <AuthErrorBox>{serverError}</AuthErrorBox>}

          <form className="auth-form" onSubmit={submit} noValidate>
            <Field
              label="Username / Email"
              htmlFor="login-email"
              error={fieldErrors.email}
              required
            >
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!fieldErrors.email}
                disabled={busy}
              />
            </Field>

            <PasswordField
              id="login-password"
              label="Password"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              autoComplete="current-password"
              disabled={busy}
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
              loading={busy}
              loadingLabel="Signing in…"
              disabled={busy}
            >
              Log in
            </Button>
          </form>

          <p className="auth-switch">
            New to Track.AE?{" "}
            <Link to="/signup" className="auth-link">
              Create an account
            </Link>
          </p>
        </>
      )}

      <p className="auth-legal faint">
        Your password is managed securely by Supabase Auth. We never store or
        display your password.
      </p>
    </AuthShell>
  );
}
