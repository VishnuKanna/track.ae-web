import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  MIN_PASSWORD_LENGTH,
  validateAuthEmail,
  validateAuthPassword,
  validatePasswordConfirm,
  type ValidationErrors,
} from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth";

export function SignUp() {
  const { user, loading, configMissing, signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors: ValidationErrors = {};
    const emailError = validateAuthEmail(email);
    if (emailError) errors.email = emailError;
    const passwordError = validateAuthPassword(password);
    if (passwordError) errors.password = passwordError;
    const confirmError = validatePasswordConfirm(password, confirm);
    if (confirmError) errors.confirm = confirmError;

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const emailValue = email.trim();
      const result = await signUp({
        name: emailValue.split("@")[0],
        email: emailValue,
        password,
      });
      if (result.needsConfirmation) {
        setCreated(true);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setServerError(
        getAuthErrorMessage(err, "Unable to create your account. Please try again.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="auth-title">
        {created ? "You're all set." : "Create your account."}
      </h1>

      {created ? (
        <>
          <p className="auth-sub">
            Your Track.AE account for <strong>{email}</strong> has been created.
          </p>
          <AuthSuccessBox>
            Sign in to start tracking your applications.
          </AuthSuccessBox>
          <Link to="/login" className="btn btn-primary btn-lg btn-block">
            Log in
          </Link>
        </>
      ) : (
        <>
          <p className="auth-sub">Build your career pipeline in minutes.</p>

          {configMissing ? (
            <AuthConfigWarning />
          ) : (
            <>
              {serverError && <AuthErrorBox>{serverError}</AuthErrorBox>}

              <form className="auth-form" onSubmit={submit} noValidate>
                <Field
                  label="Username / Email"
                  htmlFor="signup-email"
                  error={fieldErrors.email}
                  required
                >
                  <Input
                    id="signup-email"
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
                  id="signup-password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  error={fieldErrors.password}
                  hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                  autoComplete="new-password"
                  disabled={busy}
                />

                <PasswordField
                  id="signup-confirm"
                  label="Confirm Password"
                  value={confirm}
                  onChange={setConfirm}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
                  disabled={busy}
                />

                <Button
                  type="submit"
                  size="block"
                  className="btn-lg"
                  loading={busy}
                  loadingLabel="Creating account…"
                  disabled={busy}
                >
                  Create Account
                </Button>
              </form>

              <p className="auth-switch">
                Already have an account?{" "}
                <Link to="/login" className="auth-link">
                  Log in
                </Link>
              </p>
            </>
          )}
        </>
      )}

      <p className="auth-legal faint">
        Your password is managed securely by Supabase Auth. We never store or
        display your password.
      </p>
    </AuthShell>
  );
}
