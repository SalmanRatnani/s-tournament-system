# Live scores for 500 website viewers

Audience target confirmed by the organiser on 12 November 2026: up to **500 concurrent website viewers** for scores, standings and schedules. Video remains on YouTube, with the existing signed court scoreboard in OBS. This replaces the earlier 20,000-website-viewer assumption.

## Implemented architecture

- Vercel serves the application, cached public event metadata and compact public scores.
- Referees continue using authenticated, assigned, transactional Supabase scoring APIs. Ordinary games still use two-point deuce with no golden point.
- After a score/control command commits, `after()` publishes the public projection to Cloudflare. A failed publish cannot change the referee's successful scoring response.
- One SQLite-backed Durable Object holds the latest public snapshot and up to 1,200 read-only spectator sockets. Native WebSocket hibernation and automatic ping responses are used.
- Joining or reconnecting sends a full snapshot. Later messages include only changed matches/ties and, when changed, the standings. Revision gaps trigger a fresh connection; older timestamp/record versions cannot replace newer scores.
- The relay reads the public cached source once every 30 seconds while viewers are connected to repair missed publications. It never receives a Supabase service-role key. It stops its alarm when the final viewer disconnects.
- One shared socket/store per browser tab serves all mounted score components. Hidden/offline tabs stop their connection and polling. Reconnects use jittered exponential backoff.
- When the relay is absent or unavailable, visible pages automatically poll the compact score feed about every 30 seconds, with jitter, timeouts and backoff. The UI explicitly labels this slower mode. This fallback is not instant live delivery.
- Event metadata and published timetable edits refresh about every five minutes. The schedule's match status and official scores follow the live score feed.

## Official MBBL standings

The public snapshot calculates league-only standings from published league fixtures and the authoritative tie/game records. Overall totals already contain Trump awards, deductions and any recorded discipline penalties. Games won and rally difference count only completed/walkover games. Active rallies are excluded. An unfinished tie may contribute its already-confirmed games, but is not counted as a completed tie.

Ranking is overall points, games won, then rally difference. Exact equality shares a rank; alphabetical ordering is for display only. Equal-rank teams require the official Best vs Best decider; no invented result or automatic alphabetical playoff seed is used. Qualification is withheld until all 15 league ties finish, and for a tied group crossing the fourth-place boundary. This change does not add a decider-result entry workflow or new referee/penalty controls.

## Activation in the owner's Cloudflare account

No Cloudflare account is connected to this workspace. The relay source and tests are prepared; the hosted relay must be activated before the site can show `Live updates connected`.

From the repository:

```sh
cd broadcast
npm ci
npx wrangler login
npm run deploy
npx wrangler secret put PUBLISH_SECRET
```

Use a new independent random secret of at least 32 characters at the hidden prompt. Keep it in a password manager. Do not put the secret or a Cloudflare API token into source files, public environment variables or chat. This secret authenticates only publishing of the already-public snapshot; it does not grant database access.

The checked-in `wrangler.jsonc` creates a SQLite-backed Durable Object and contains the production website origin/source URL. The deploy command returns the actual Worker URL; do not guess the account subdomain. Check that the account remains on the intended free plan. No paid plan is required by this configuration.

Set these **server-side production variables in Vercel**, then redeploy the website:

| Variable | Value |
| --- | --- |
| `PUBLIC_SCORE_RELAY_URL` | Actual HTTPS Worker base URL returned by deployment |
| `SCORE_RELAY_PUBLISH_SECRET` | Exactly the same secret as Cloudflare `PUBLISH_SECRET` |

A preview deployment should use its own relay and source data. The production relay accepts only the configured production browser Origin. Add only explicitly needed trusted origins. Origin checks and the connection cap limit accidental misuse; they are not bot-proof authentication.

Verify `/api/public/event` returns a `wss://…/scores` URL, then open `/live` and `/standings` and check `Live updates connected`. Perform the real-device scoring rehearsal using staging/test data before event day. The signed OBS URL still needs its existing `OBS_OVERLAY_SIGNING_SECRET` configured and a rehearsal in OBS.

## Validation commands

```sh
npm run typecheck
npm test
npm run build
cd broadcast
npm ci
npm run check
npm run test:load
```

`test:load` uses Cloudflare's local workerd runtime, a synthetic public score source, and actual local WebSocket clients. It ramps through 100, 500 and 1,000 simultaneous connections; checks delivery of updates for all three courts; verifies stale-update rejection, reconnect snapshots, source failure, publisher authorization and recovery from persisted state after a runtime restart. It sends no score writes or load traffic to the real application/database. Local timing is not a production latency guarantee or a free-tier quota measurement.

## Request budget and limits

At a constant 500 viewers for 12 hours, fallback score polling at 30 seconds is about 720,000 requests; metadata at five minutes adds about 72,000. This excludes first loads, JS/images, manual refreshes, retries, staff/OBS requests and other account usage. Check the remaining Vercel allowance before relying on fallback for an entire event.

With healthy push delivery, viewers stop repeated HTTP score polls. The relay's 30-second repair reads are about 1,440 over 12 hours, independent of viewer count. Score commands and initial/reconnect requests still count. Cloudflare has separate free Worker/DO request, CPU, duration and storage quotas. Outgoing WebSocket messages do not incur a per-message request charge, but broadcasting still consumes compute. Quota exhaustion can cause errors; this is not an unlimited-service promise.

Production acceptance: measure point-commit-to-display delay, reconnect recovery, Worker/DO CPU and duration, storage writes, cache hit rate and Vercel/Supabase usage on the actual deployed services. Run a 500-client rehearsal with a 1,000-client burst in a staging environment; never load-test the real free database during tournament play.

Rollback: clear `PUBLIC_SCORE_RELAY_URL` in Vercel and redeploy. Pages return to the labelled 30-second fallback. Referee scoring and OBS remain independent of the public relay.

Primary references checked 12 November 2026:
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/realtime/limits

## Local validation result — 12 November 2026

The local workerd rehearsal passed 100, 500 and 1,000 concurrent clients with 10 updates at each level (16,000 total deliveries). Measured local p95 publish-to-client times were 23 ms, 49 ms and 92 ms respectively; these are loopback measurements, not internet latency targets. There were zero extra source reads during the update phases. Fifty reconnects received the latest snapshot; unauthorized publishing was rejected; stale state was ignored; source failure retained the last score; and a fresh runtime restored the persisted snapshot while the source was offline. The entire rehearsal used three shared source reads, including deliberate failure/restart checks.

Application verification: 59 tests passed, TypeScript passed, and the production Next.js build passed. Hosted Cloudflare deployment and actual production usage/latency remain unverified until account activation.
