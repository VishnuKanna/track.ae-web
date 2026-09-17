import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, KeyRound, LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { getAuthErrorMessage, getAvatarUrl } from "@/lib/auth";
import {
  MIN_PASSWORD_LENGTH,
  validateAuthPassword,
  validatePasswordConfirm,
  type ValidationErrors,
} from "@/lib/validation";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthErrorBox } from "@/components/auth/AuthShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { downloadCSV, jobsToRows, buildCSV } from "@/lib/csv";
import type { HRContact } from "@/types/database";

export function Settings() {
  const { profile, user, logout: signOut, updatePassword } = useAuth();
  const { jobs, companies, contactsForJob, hydrated, loading } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [busy, setBusy] = useState<string | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmDatamap, setConfirmDatamap] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<ValidationErrors>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const hasPassword = !!user?.identities?.some((i) => i.provider === "email");

  const doUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const errors: ValidationErrors = {};
    const passwordError = validateAuthPassword(password);
    if (passwordError) errors.password = passwordError;
    const confirmError = validatePasswordConfirm(password, confirmPassword);
    if (confirmError) errors.confirm = confirmError;
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});

    setBusy("password");
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      toast.success(
        hasPassword ? "Password updated." : "Password set. You can now sign in with email."
      );
    } catch (err) {
      setPasswordError(getAuthErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const doExport = async () => {
    setBusy("export");
    try {
      await new Promise((r) => setTimeout(r, 350));
      const contactsByJob: Record<string, HRContact[]> = {};
      for (const job of jobs) contactsByJob[job.id] = contactsForJob(job.id);
      downloadCSV(buildCSV(jobsToRows(jobs, contactsByJob)));
      toast.success("CSV downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
      setConfirmExport(false);
    }
  };

  const doSignOut = async () => {
    setBusy("signout");
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out.");
    } finally {
      setBusy(null);
    }
  };

  const doDataReset = async () => {
    toast.info("Full data reset isn't exposed here for safety. Delete applications in the app instead.");
    setConfirmDatamap(false);
  };

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Settings</h1>

      <div className="settings-cols">
        <div className="panel settings-profile">
          <Avatar size="lg" name={profile?.full_name ?? "User"} src={getAvatarUrl(profile, user)} />
          <div>
            <div className="settings-name">{profile?.full_name ?? "Track.AE user"}</div>
            <div className="faint" style={{ fontSize: 13 }}>{profile?.email ?? user?.email}</div>
          </div>
          <Button variant="secondary" loading={busy === "signout"} loadingLabel="Signing out…" onClick={() => setShowSignOut(true)}>
            <LogOut size={15} /> Sign out
          </Button>
        </div>

        <div className="section">
          <h2 className="section-label" style={{ marginBottom: 12 }}>Data & privacy</h2>

          <div className="stack" style={{ gap: 10 }}>
            <div className="panel row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>Export applications (CSV)</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  One row per application — includes HR contacts & notes.
                </div>
              </div>
              <Button variant="secondary" size="sm" loading={busy === "export"} loadingLabel="Exporting…" onClick={() => setConfirmExport(true)}>
                <Download size={15} /> <span className="hidden-mobile">Export</span>
              </Button>
            </div>

            <div className="panel row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>Your data lives in your own Supabase project</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  Row-level security keeps every record scoped to your account.
                </div>
              </div>
              <ShieldCheck size={20} className="muted" />
            </div>

            <div className="panel row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>Reset local UI state</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  Re-read everything from the database.
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { window.location.reload(); return; }}>
                <RefreshCw size={15} /> <span className="hidden-mobile">Reload data</span>
              </Button>
            </div>

            <div className="panel row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>Danger zone</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  Per-application deletion is available in each application's page.
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirmDatamap(true)}>
                <Trash2 size={15} /> Reset data
              </Button>
            </div>
          </div>

          <div className="faint" style={{ marginTop: 22, fontSize: 12 }}>
            {hydrated && !loading
              ? `${jobs.length} applications · ${companies.length} companies`
              : "Syncing…"}
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 28 }}>
        <h2 className="section-label" style={{ marginBottom: 12 }}>Account & security</h2>
        <div className="panel settings-password">
          <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 4 }}>
            <KeyRound size={16} className="series-orange" />
            <span style={{ fontWeight: 500 }}>
              {hasPassword ? "Change your password" : "Set a Track.AE password"}
            </span>
          </div>
          <p className="faint" style={{ fontSize: 13, marginBottom: 8 }}>
            {hasPassword
              ? "Update the password you use to sign in with your email address."
              : "Add a password to sign in with email instead of Google — same account, same data."}
          </p>

          {passwordError && <AuthErrorBox>{passwordError}</AuthErrorBox>}

          <form className="auth-form" onSubmit={doUpdatePassword} noValidate>
            <PasswordField
              id="settings-password"
              label="New password"
              value={password}
              onChange={setPassword}
              error={passwordErrors.password}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              autoComplete="new-password"
              disabled={busy === "password"}
            />
            <PasswordField
              id="settings-confirm"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={passwordErrors.confirm}
              autoComplete="new-password"
              disabled={busy === "password"}
            />
            <Button
              type="submit"
              variant="secondary"
              loading={busy === "password"}
              loadingLabel="Saving…"
              disabled={busy !== null}
            >
              {hasPassword ? "Update password" : "Set password"}
            </Button>
          </form>
        </div>
      </div>

      {confirmExport && (
        <ConfirmDialog
          title="Export your applications?"
          description="Generates a CSV file on your device with every application and its HR contacts."
          confirmLabel="Download CSV"
          tone="primary"
          onCancel={() => setConfirmExport(false)}
          onConfirm={doExport}
        />
      )}

      {confirmDatamap && (
        <ConfirmDialog
          title="Reset all data?"
          description="This is intentionally not self-serve. Delete each application from the app, or use the Supabase dashboard to clear tables."
          confirmLabel="Close"
          tone="primary"
          onCancel={() => setConfirmDatamap(false)}
          onConfirm={doDataReset}
        />
      )}

      {showSignOut && (
        <ConfirmDialog
          title="Sign out?"
          description="Your data stays safe in the cloud. You can sign back in anytime."
          confirmLabel="Sign out"
          tone="primary"
          onCancel={() => setShowSignOut(false)}
          onConfirm={doSignOut}
        />
      )}
    </div>
  );
}