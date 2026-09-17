# Supabase Setup

Track.AE uses **Supabase Auth with Email + Password**. There is no third-party
or social sign-in. Follow the steps below for a new environment.

> Never commit real credentials. Only the **anon** key is used by the frontend.

---

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

These are the **only** frontend Supabase environment variables Track.AE
requires. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` (or any secret key) to the
frontend.

---

## 2. Authentication settings (required)

Track.AE uses Supabase's built-in email/password authentication.

### Enable the Email provider

**Authentication → Sign In / Providers → Email**

- Enable the **Email** provider.
- Leave **Confirm email** turned **OFF** (see next section).

### Disable email confirmation (required)

Track.AE does **not** send email verification/confirmation emails. New users
must be able to sign in and use the app immediately after registering.

In the Supabase dashboard:

- **Authentication → Sign In / Providers → Email**
- Turn **Confirm email** → **OFF** (disabled).

This is the exact setting to change. With it off, `supabase.auth.signUp()`
returns an active session immediately, so the app authenticates the user,
loads their profile, and redirects to the Dashboard without any email step.

Track.AE does not implement any custom email-verification system.

### Password policy

Optionally set a minimum password length under
**Authentication → Policies / Settings**. Track.AE enforces a minimum of
8 characters in the UI regardless of this setting.

### Social / third-party providers

Do **not** enable any social or OAuth providers. Track.AE has no social sign-in
code or configuration and only supports email/password.

---

## 3. Password recovery

Forgot-password uses Supabase's secure recovery flow:

1. The app calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
2. The user opens the recovery link and lands on `/reset-password`.
3. The app calls `supabase.auth.updateUser({ password })` with the new password.

No passwords are ever stored, displayed, or emailed in plain text by Track.AE.

### Redirect URLs

Add your deployed origin to **Authentication → URL Configuration**:

- **Site URL**: your production app URL (for example `https://track.ae`).
- **Redirect URLs**: allow
  - `https://your-domain.com/reset-password`
  - `https://your-domain.com/auth/callback`
  - plus the equivalent local dev origin if you develop locally.

Track.AE builds redirect URLs from `window.location.origin`, so it works on any
host without hardcoded URLs. Never hardcode `localhost` or a specific deploy
domain in the code.

---

## 4. Database

Apply the SQL files in `supabase/migrations/` (via the Supabase SQL editor or the
Supabase CLI). They create the schema and RLS policies for:

`profiles`, `jobs`, `companies`, `hr_contacts`, `resumes`, `job_events`.

### Profiles

The `profiles` table stores public profile data only:

```
id, full_name, email, avatar_url, created_at, updated_at
```

It intentionally has **no password columns**. Supabase Auth owns the password
credential. Never add `password`, `password_hash`, or `plain_password` columns.

### Row Level Security

All user data is isolated with RLS using `auth.uid()`. Each user can only access
their own jobs, companies, HR contacts, resumes, and events. Do not disable or
weaken RLS policies.

---

## 5. Verify

1. `npm run typecheck` and `npm run build` succeed.
2. Sign up with an email + password and confirm you are taken straight to the
   Dashboard (no confirmation email is sent).
3. Log out and log back in with the same credentials.
4. Use **Forgot password?** and confirm you can set a new password.
5. Confirm a second user cannot see the first user's data (RLS).
