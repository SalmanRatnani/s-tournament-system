# Secure owner account and first deployment

**This application is a separate project. Do not run migrations in s-auction-system.**

The starter archive contains **no owner password** and does not create an account until a separate Supabase database is connected. Never commit passwords or service-role keys, even in `.env.example`.

1. Create a new Supabase project called `s-tournament-system`, selecting an organization you control. Note: this project is separate from the auction app and may incur usage charges.
2. Run `supabase/migrations/001_initial.sql` and then `supabase/migrations/002_team_league_and_roles.sql` in the NEW project's SQL Editor.
3. In **Authentication > Providers > Email**, enable email/password and confirmation for sign-ups. Configure redirect URL(s) to include your localhost and deployed domain as appropriate.
4. Copy the URL and publishable/anon key to `.env.local`, using `.env.example` as a template. Copy the service-role key only into `SUPABASE_SERVICE_ROLE_KEY` on the server; never prefix it with NEXT_PUBLIC_ or place it in the browser.
5. Run `npm install` then `npm run dev`. Visit `/register` and create your organizer user with a NEW, unique password of at least 12 characters. Confirm the verification email and sign in. All self-registrations begin as `viewer`.
6. Only after verification, in the **new project's private SQL Editor**, execute this one-time SQL, replacing `OWNER_EMAIL_HERE` with the exact email used for the confirmed registration:

```sql
update public.profiles p
set role = 'owner'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('OWNER_EMAIL_HERE')
  and u.email_confirmed_at is not null;
```

Verify the editor reports **1 row updated**, then sign out/in and visit `/admin`. Do not execute this in public application code. If it returns 0 rows, check account confirmation and email spelling. Never re-run for a different email without verifying the account identity.

7. In Vercel, create a NEW Next.js project from your new Git repository, add three env variables (URL, anon/publishable key, server-only service-role key), and deploy. Set the correct Supabase Site URL and Redirect URLs.
8. Have referees register normally and verify their emails; change their `viewer` roles to `referee` through `/admin/users`. Assign them to match rubbers in `/admin/referees`.

**Important security note:** A password was typed into the planning conversation. For production use a NEW unique password, enable available MFA for owner access, and do not share that password in chat or source files. The project never includes the password.
