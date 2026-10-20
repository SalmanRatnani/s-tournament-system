# Staff Google sign-in and email verification (free-tier setup)

Spectators do **not** sign in. Staff consists of the Main Controller (owner) and assigned referees.

## Provider setup — action required from the Google account owner
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Create/select a project, configure Google Auth Platform consent, and create an **OAuth 2.0 Client ID** of type **Web application**. This setup does not require a paid Google API. Review the provider's current quotas and billing before enabling anything else.
2. Add authorized redirect URI: `https://wcrgmxswivnbwbdzbxie.supabase.co/auth/v1/callback`. This is the **Supabase** callback URI, *not* the Next.js page.
3. Copy the **Google OAuth Client ID and secret** directly into [Supabase Authentication > Sign In / Providers > Google](https://supabase.com/dashboard/project/wcrgmxswivnbwbdzbxie/auth/providers). Never paste the client secret into chat or GitHub.
4. Set [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/wcrgmxswivnbwbdzbxie/auth/url-configuration): Site URL `https://s-tournament-system.vercel.app` and redirect allow-list `https://s-tournament-system.vercel.app/auth/callback`. Add approved preview/local origins only as necessary; avoid permissive wildcard production redirects.
5. Enable email confirmation under Supabase Authentication > Providers > Email. Auth must verify emails before staff accounts can access APIs. For email/password, recipients must confirm via the provider's email flow. Google provides a verified identity only if the identity provider marks the email verified. **Email possession alone is not staff authorization.**
6. Provision **only approved staff**; use Supabase Authentication > Users (or invite accounts), and set `profiles.role` to `owner` or `referee` through secured owner setup. New OAuth users start as `viewer`, never owner/referee.
7. Test Google owner login, Google unapproved login, verified referee login, unverified password login, unauthorized score edits, and public watch flow before tournament day.

## Tournament Vercel environments
Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable API key) and **server-only** `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Do not use the auction keys. Add server-only `OBS_OVERLAY_SIGNING_SECRET` (32+ random bytes). Never put either secret under `NEXT_PUBLIC_`.

Enabling only the public keys switches the app out of demo mode, but server APIs will remain unavailable until the service-role key is configured. Deploy these together, not as a partial configuration.

## Limits
Google OAuth sign-in uses free Google OAuth configuration, but Supabase Auth hosted email delivery has rate limits, and free-tier infrastructure has usage limits. No unlimited traffic or free custom SMTP is promised.
