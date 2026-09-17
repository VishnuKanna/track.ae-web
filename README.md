# Track.AE

Your entire job search, organized in one intelligent command center. Track every
application, HR contact, follow-up, interview, and offer in a single quiet place.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **React Router 7** for routing and protected routes
- **Supabase** for authentication, Postgres, and storage
- **motion/react** for the animation system
- **lucide-react** for icons

## Authentication

**Supabase Auth — Email + Password.**

- Accounts are created and authenticated with Supabase's secure email/password
  flow (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`).
- Passwords are owned and hashed by Supabase Auth. They are **never** stored in
  application tables, `localStorage`, `sessionStorage`, or cookies.
- Email confirmation is disabled so users can sign in immediately after
  registering. See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for the
  exact dashboard setting.
- Password recovery uses Supabase's secure
  `resetPasswordForEmail` + `updateUser({ password })` flow. Passwords are never
  displayed or emailed in plain text.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the two required variables (Supabase → Project Settings → API):

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   Only the **anon** key belongs in the browser. Never put the service-role key
   in frontend environment variables.

4. Apply the database migrations in `supabase/migrations/` to your project, then
   start the app:

   ```bash
   npm run dev
   ```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and produce a production build |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript with no emit |

## Data isolation

Every table is protected by Supabase Row Level Security. Ownership is enforced
with `auth.uid()`, so each user can only read and write their own jobs,
companies, HR contacts, resumes, and events. Do not weaken or bypass RLS.
