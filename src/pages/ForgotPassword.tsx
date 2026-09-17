import { useState } from "react";
import { Link } from "react-router-dom";
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
import { validateAuthEmail, type ValidationErrors } from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth";

export function ForgotPassword() {
  const { configMissing, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const emailError = validateAuthEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setServerError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell backLabel="Back to login" backTo="/login">
      <h1 className="auth-title">Reset your password.</h1>

      {sent ? (
        <>
          <p className="auth-sub">
            If an account exists for <strong>{email}</strong>, a password reset
            link is on its way.
          </p>
          <AuthSuccessBox icon="mail">
            Open the link in your email to choose a new password. It expires
            for your security.
          </AuthSuccessBox>
          <Link to="/login" className="auth-link">
            Back to log in
          </Link>
        </>
      ) : (
        <>
          <p className="auth-sub">
            Enter your account email and we'll send you a reset link.
          </p>

          {configMissing ? (
            <AuthConfigWarning />
          ) : (
            <>
              {serverError && <AuthErrorBox>{serverError}</AuthErrorBox>}

              <form className="auth-form" onSubmit={submit} noValidate>
                <Field label="Email" htmlFor="forgot-email" error={fieldErrors.email} required>
                  <Input
                    id="forgot-email"
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

                <Button
                  type="submit"
                  size="block"
                  className="btn-lg"
                  loading={busy}
                  loadingLabel="Sending…"
                  disabled={busy}
                >
                  Send reset email
                </Button>
              </form>

              <p className="auth-switch">
                Remembered it?{" "}
                <Link to="/login" className="auth-link">
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </>
      )}
    </AuthShell>
  );
}
