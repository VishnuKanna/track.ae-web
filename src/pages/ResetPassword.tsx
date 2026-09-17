import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/store/ToastContext";
import { Button } from "@/components/ui/Button";
import { BrandLoader } from "@/components/ui/BrandLoader";
import {
  AuthConfigWarning,
  AuthErrorBox,
  AuthShell,
} from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  MIN_PASSWORD_LENGTH,
  validateAuthPassword,
  validatePasswordConfirm,
  type ValidationErrors,
} from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth";

export function ResetPassword() {
  const { user, loading, configMissing, updatePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors: ValidationErrors = {};
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
      await updatePassword(password);
      toast.success("Password updated. You're signed in.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(
        getAuthErrorMessage(err, "Unable to update your password. Please try again.")
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <BrandLoader label="Checking your reset link…" />;

  const invalidLink = !user;

  return (
    <AuthShell backLabel="Back to login" backTo="/login">
      <h1 className="auth-title">
        {invalidLink ? "Reset link expired." : "Choose a new password."}
      </h1>

      {configMissing ? (
        <AuthConfigWarning />
      ) : invalidLink ? (
        <>
          <p className="auth-sub">
            This password reset link is invalid or has expired. Request a new
            one to continue.
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-lg btn-block">
            Request a new link
          </Link>
        </>
      ) : (
        <>
          <p className="auth-sub">
            Pick a strong password for your Track.AE account.
          </p>

          {serverError && <AuthErrorBox>{serverError}</AuthErrorBox>}

          <form className="auth-form" onSubmit={submit} noValidate>
            <PasswordField
              id="reset-password"
              label="New password"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              autoComplete="new-password"
              disabled={busy}
            />

            <PasswordField
              id="reset-confirm"
              label="Confirm new password"
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
              loadingLabel="Updating…"
              disabled={busy}
            >
              Update password
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
