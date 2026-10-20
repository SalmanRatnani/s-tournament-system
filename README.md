# S Tournament System

A responsive Next.js badminton tournament web app with 3 realtime score feeds, secure referee controls, 3 transparent OBS browser overlays, public scores, and a multi-court live center. It is completely separate from `s-auction-system`.

## What works in v0.1

- Public dashboard, 3 court cards, fixtures, match results, live watch pages.
- Referee score controller: one-tap points, game rollover, automatic match winner, undo, pause/resume/start (admin only in production).
- Unique OBS overlays at `/overlay/1`, `/overlay/2`, `/overlay/3` (transparent browser sources, 1920×1080).
- Supabase JWT email/password login and server-checked referee assignments.
- Atomic PostgreSQL scoring with per-match row locks, idempotent request IDs and an immutable score-event log.
- Realtime scores via Supabase Postgres Changes, with 15-second reconciliation after dropped messages.
- Explicit browser-only demo mode when Supabase public credentials are missing. **Demo updates do NOT synchronize between phones!**

**Scaffold / next milestones:** player/team registration UI, draw generation, bracket logic, rankings, automatic court allocation, referee assignment UI, stream health, sponsor graphics and OBS WebSocket control. The navigation is in place, but these modules are not complete. No actual YouTube livestream is started by this website.

## Local setup

1. Install Node.js 22 LTS or newer and run `npm install` then `npm run dev`.
2. Open `http://localhost:3000` for the dashboard, `http://localhost:3000/referee` for simulated point scoring, and `http://localhost:3000/overlay/1` for the transparent OBS overlay.
3. To switch to production data, create **a new Supabase project**, copy `.env.example` to `.env.local`, and fill all three variables. Do not reuse auction Supabase credentials.
4. Run `supabase/migrations/001_initial.sql` in the NEW Supabase SQL Editor. Optional: run `supabase/seed.sql` **only in a new empty development project**.
5. In Supabase Auth, create 1 organizer and 3 referee accounts. Assign their roles in `public.profiles` after creating the users, then insert mappings in `public.referee_assignments`. Example:

```sql
-- Replace user UUIDs and match UUIDs obtained from the Supabase dashboard.
insert into public.profiles(id, display_name, role) values ('<admin-user-uuid>', 'Organizer', 'admin');
insert into public.profiles(id, display_name, role) values ('<referee-1-user-uuid>', 'Ref Court 1', 'referee');
insert into public.referee_assignments(match_id,user_id) values ('<court-1-match-uuid>', '<referee-1-user-uuid>');
```

Add a different assignment for each court. All score writes are handled by authenticated API routes and an authorization check on the server. Neither public clients nor authenticated clients get direct write permissions.

6. Configure these environment variables in Vercel project settings in the appropriate environments, keeping `SUPABASE_SERVICE_ROLE_KEY` **server-only and secret**. Deploy the app with the Next.js preset. Do not expose this value to the client.

## OBS: 3 independent YouTube streams

1. Prepare 3 camera phones on tripods and 3 independent referee phones. Stabilize Wi-Fi and supply power to each camera phone.
2. For each camera phone, use [VDO.Ninja](https://vdo.ninja/): `Add your Camera to OBS` -> start the camera -> copy its **VIEW** link. Each phone must have a unique camera room/stream ID.
3. On the OMEN laptop, install OBS Studio; create three separate scenes (`COURT 01`, `COURT 02`, `COURT 03`). Within each scene, create a **Browser Source** for that camera's VDO.Ninja VIEW URL; set 1920×1080 or 1280×720 according to capture quality.
4. Add a second Browser Source for `https://YOUR-VERCEL-DOMAIN/overlay/1`, and analogous `/overlay/2`, `/overlay/3`; size each source at **1920×1080**. Keep the overlay above the camera in the OBS source list. Uncheck shutdown-on-hidden if you need it continuously active.
5. Create **three separate YouTube live events / ingest destinations**; verify the channel/account permits concurrent events/keys. A default OBS installation handles one streaming output. For three **different court scenes** use three OBS instances with different profiles and scene collections, a vetted **per-scene** streaming plugin, or a dedicated multichannel encoder. Standard multi-RTMP plugins generally duplicate the same active scene to several destinations, so they are not sufficient for three distinct court videos. Validate plugin/OBS compatibility, NVENC session usage and audio routing in rehearsal; avoid assuming OBS's default Start Streaming publishes all 3 scenes at once.
6. For first test start with **720p30 H.264 NVENC** output for each stream at 3–4 Mbps video bitrate plus audio. This uses around 10–14 Mbps total *upload* before overhead. Gradually tune upwards after verifying stable upload, not just ISP advertised download rate. At 1080p30 the required rate is higher. Watch OBS dropped frames, render/encode lag, CPU/GPU use and YouTube stream health.
7. Point OBS at 3 unique RTMP targets/keys using your encoder solution. Keep ingest keys ONLY in OBS/local environment, **never** in web UI, repository or public Supabase tables. The app embeds each court's public 11-character YouTube video ID (`matches.youtube_video_id`).
8. On the 3 referee phones, sign in separately, choose each assigned match, and score. Use the browser-source overlay, not OBS Remote Control, as the referee interface.
9. **Important delay:** The live website score and OBS overlay update promptly, but the YouTube player is delayed due to video ingestion/transcoding. Consider showing an in-player notice if a public page displays live scoring ahead of the video.

### First acceptance test

- Camera feeds: independently verify all 3 feeds remain visible and correctly framed for 30–60 minutes.
- Score lifecycle: 20–20, 29–29, 30-point cap, game rollover, best-of-3 match completion and reversing the match-winning point.
- Two near-simultaneous referee taps: audit log and per-match serialized atomic updates; verify request-ID retry is a no-op.
- Security: unauthenticated scoring denied, one referee cannot score another court, public can only read scores.
- Outage: close/reconnect a browser source and verify it loads the latest score; verify mobile refresh recovers.
- OBS: verify 3 distinct ingest targets running together, good YouTube stream health and acceptable laptop thermals.

## Limitations

- Prototype not tested against a provisioned Supabase project in this environment. The local container cannot fetch npm packages; install and run `npm run build` on your computer or in Vercel to verify the complete build.
- Production create/edit UI for fixtures and referee assignments, live stream event creation and match disputes are next milestones.
- Fast local score updates and public video may be offset; do not attempt frame-accurate synchronized video/timecode in this version.
- Match scoring model defaults to standard 21-point badminton games. Team ties currently consist of standalone rubber matches; automatic team-tie aggregation is not yet implemented.

---

## Version 0.2 — Organizer / six-team competition

The independent organizer module adds:

- `/register` / `/login` / `/account` — accounts, email/password, reset and password change
- `/admin` — **server-protected owner/admin controller**
- `/admin/users` — viewer, referee, admin, owner roles; only the owner can promote admins
- `/admin/teams` — six teams; 18 real players each; team and roster limits enforced in SQL
- `/admin/fixtures` — generate 15 league team ties, add singles/doubles rubbers, generate top-four semifinals and final
- `/admin/referees` — assign registered and approved referee accounts to specific rubbers
- `/standings`, `/knockouts`, `/schedule`, `/teams`, `/players` — public competition views

**Follow [`docs/SECURE_OWNER_SETUP.md`](docs/SECURE_OWNER_SETUP.md) before using authentication.** The owner account is NOT auto-created; use the one-time private Supabase SQL after email verification. Never put a password or service-role key in a repo. See [`docs/TOURNAMENT_OPERATIONS.md`](docs/TOURNAMENT_OPERATIONS.md) for match format and workflows.

```
node --test tests/*.test.cjs
npm run typecheck
npm run build
```

The offline package may not include `node_modules`; install from npm locally before building. This code has not yet been verified with a real Supabase connection or OBS device tests.

## Version 0.3 — Configurable sets and auction handoff

- **`/admin/scoring-rules`**: point target 11–30, cap up to 30, two-point deuce/advantage toggle and 1-set or best-of-3. Settings automatically apply to new rubbers and unstarted scheduled rubbers; cannot change after a rubber begins.
- **`/admin/import-auction`**: validate/preview version-1 completed-auction JSON; all six teams/108 unique players; owner/admin confirms atomic import into an empty tournament.
- Player directory displays exported photo URLs, player codes, categories and playing captains.
- **Run `supabase/migrations/003_scoring_and_auction_handoff.sql`** in the NEW tournament database, after migrations 001/002. Do not run this migration on s-auction-system.
- Auction-side exporter is separately packaged and proposed as a feature branch; see `docs/AUCTION_TRANSFER.md`.
- Real camera, phone, OBS and Supabase integration tests remain outstanding; no production deploy has occurred.
