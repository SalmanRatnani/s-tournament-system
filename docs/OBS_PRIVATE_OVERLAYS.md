# Private OBS overlays (Main Controller only)

The public viewer hub `/live` and `/watch/1` through `/watch/3` never need login.

The score graphics used inside OBS are different from the public viewer page. They are operational assets and must not be advertised in public navigation.

1. Configure a **server-side only** environment variable `OBS_OVERLAY_SIGNING_SECRET` in the tournament Vercel project. Generate a random secret of 32+ bytes; do not put it in code, URLs, GitHub, `NEXT_PUBLIC_` values, or a public database table. Add it separately to Preview and Production if both environments need testing. Preview and Production may use independent values.
2. Sign in as the Main Controller (the `owner` role). Visit `/admin/production`.
3. Generate a private OBS URL for each court. Copy it only into the corresponding OBS Browser Source. A URL is valid for **24 hours**, read-only, and limited to its court.
4. Before expiry, generate and paste a new URL into OBS; OBS cannot refresh private login sessions. A score source only reads publicly visible match scores. All scoring mutations still require referee/owner authorization.
5. If a private overlay URL is exposed, replace `OBS_OVERLAY_SIGNING_SECRET` in Vercel and redeploy to invalidate *all* previously issued links. Generating another URL without rotating the secret does not immediately revoke the earlier URL.

Protection notes:
- An ordinary unsigned request to `/overlay/{court}` responds with not-found; server validation occurs before rendering.
- The signing secret never reaches client-side JavaScript; HMAC-SHA256 signatures are checked with timing-safe comparison.
- The only issuing endpoint, `POST /api/admin/overlay-links`, checks the authenticated `owner` role.
- Browser/source URLs are capabilities: anyone in possession of an unexpired URL can view the overlay. Keep them private, use HTTPS, and avoid sharing screenshots that show the URL.
- Do not paste YouTube RTMP ingest secrets into the spectator link manager.

Public pages have **no Overlay button**, and referee scoring screens have no broadcast-production tools. This setup uses no paid add-on, but free hosting and database usage caps still apply.
