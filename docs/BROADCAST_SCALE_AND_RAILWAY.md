# MBBL Scoring + High Viewer Traffic: Infrastructure Runbook

## Production topology (updated 12 November 2026)
The organiser selected the free-budget approach: OBS embeds the scoreboard in each
court video; YouTube carries the audience. /live prioritises direct YouTube watch
links. /watch/1–3 shows court score snapshots and outbound YouTube links; it does
not embed video, poll scores, connect Realtime, or authenticate spectators.
Broadcast-link refresh and score snapshots are explicit user actions. This avoids millions of five-second
polls during a long broadcast. A 20,000-viewer capacity guarantee has NOT been tested.

/api/public/event holds slow-changing courts, fixtures, teams and player rosters:
60-second server and CDN caching. /api/public/scoreboard holds compact scores only,
with a 3-second shared cache. Browser consumers share requests and cached state.
The SQL score projection reads ties and games in one consistent database snapshot,
excluding pending games, hidden Trump choices, staff identities and audit logs.

Signed OBS pages call /api/overlay/{court}/scoreboard with the same court-bound,
24-hour token in the Authorization header. That endpoint verifies the token on
every call, reads only the selected court, and uses private/no-store headers.
Only these few clients poll at about one second; errors use exponential backoff
(up to 60 seconds), timeout/abort, visibility/offline handling and last-good data.
Stale network/cache responses cannot overwrite a newer score snapshot. OBS must
keep the browser source active; rotate its signed URL before its 24-hour expiry.

Referees use authenticated APIs and assignment checks. A point appears from the
server acknowledgement, without a second full-table fetch. Lost responses retry
the SAME request ID and version; ambiguous commands block new taps until resolved.
Live reconciliation runs every two seconds and slows outside active games.

## Confirmed scoring
Ordinary MBBL games: target 15, win by two after 14–14, no golden point and no
sudden-death cap. 15–14 is not a win; 16–14 is. 30–29 is not a win; 31–29 is.
A winning rally blocks further points but allows Undo until owner finalisation.
Finalisation applies each team's Trump points once and pauses before the next game.
The distinct rulebook relay remains first to 30; walkovers remain 15–7.

Apply existing migrations 009, 010 and 011 before
20261111160805_mbbl_deuce_and_compact_scores.sql. They do not create lineups or start
matches. The owner still prepares each tie and assigns officials. The SQL rehearsal
in tests/sql/mbbl-deuce.sql validates the entire league-game path then rolls back
all test data. It requires an unused scheduled fixture on a free court.

## Load distribution / Railway
A Railway deployment may run several application replicas behind Railway's public
routing/load distribution. To enable, connect the Railway app, create a project/service
from SalmanRatnani/s-tournament-system, use the Railway config, set the public environment
variables and server-only secrets in Railway's secure environment settings, and attach a
custom domain after end-to-end testing. Start with **one replica** and measure actual cost.
Scale to >=2 replicas only if request/CPU metrics justify it; enable health checks and
rolling deployments. Railway does not automatically provide free unlimited capacity, and
this config alone does not provision a load balancer or replicas.
Commercial hosting / billing must be approved separately. Keep current Vercel production
as the primary domain until the Railway deployment passes live tests; do not enable two
competing score writers or casually switch DNS. Both application platforms must use the
same authorised database and consistent schema versions.

Required protected Railway env:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
OBS_OVERLAY_SIGNING_SECRET.
Service-role / signing secrets must be private, not NEXT_PUBLIC. Do not add them to GitHub,
logs or chatbot messages. Configure production callback origins correctly in Supabase Auth
if Railway uses a new host.

Recommended edge settings: cache /api/public/scoreboard at CDN; do not cache
/api/score, /api/mbbl/score, /api/mbbl/official, /api/admin/*, auth callbacks, or
signed /overlay links. A default Railway app domain is not a substitute for an
edge caching layer when there are many spectators.

## Operational gates before 22 Nov 2026
1. Deuce confirmed on 11 November 2026; ensure the deuce migration is installed.
2. Owner validates nine pairs, preselects independent Trump games and establishes
   a signed/controlled tie roster. No automated play before rule confirmation.
3. Owner authorizes 3 referee accounts and their **specific** MBBL ties; no sharing
   Owner credentials or public score-write endpoints.
4. Simulate 3 simultaneous referees including conflicting taps, rapid retries,
   Undo, offline reconnection and completed game transitions. Measure p95 score write.
5. Simulate spectators with k6/Artillery/Locust. Inspect CDN HIT rate, backend
   query volume, data transfer, DB connections and spend. Do not start 10,000-client
   load against the free production database.
6. Test 3 independent OBS/YouTube encoders with venue network uplink, phone feeds,
   signed overlay expiry and stream failover. Use a published fallback slate.
7. Configure cost budgets, alerts, error tracking, incident playbook and rollbacks.
8. The dependency lockfile is reconciled; CI uses npm ci. Check failed deployments.

## Limits / caveats
Do not represent a planned fixture as live before an organizer starts it.
Broadcast elapsed time does not determine referee permission. Public update lag
may be several seconds; YouTube itself can be further delayed.
If the CDN is bypassed and every viewer hits the backend, scaling won't work.
Railway replicas distribute application requests but do not increase free Supabase
connection capacity, and may increase costs.

Relevant documents:
https://docs.railway.com/reference/scaling
https://docs.railway.com/guides/healthchecks
https://docs.railway.com/reference/pricing/plans
https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
https://vercel.com/docs/edge-network/caching

## Website audience requirement — 12 November 2026
The organiser also expects spectators to visit the website for automatically
updating scores, standings and schedules. Moving video to YouTube does not remove
that traffic. Automatic public score delivery is NOT implemented by the manual
snapshot mode, and the current MBBL standings page still contains a placeholder.

The next implementation needs a small public state projection with one shared
read-only connection per browser tab, backed by an independently sized distribution
service. Publish only after committed official changes, preserve monotonic versions,
replay the latest snapshot on reconnect, and retain the last confirmed score on
errors. Standings should use confirmed league games, official Trump/penalty totals,
games won and rally difference; unfinished rallies must not count as final results.
Cache schedule/roster data separately and refresh it only when needed.

Cloudflare Durable Objects with hibernating WebSockets is a candidate, not a deployed
service or proven capacity claim. Its free quotas, connection churn, distribution
across objects, CPU and storage must be measured with the planned event duration.
Free quota exhaustion causes errors. Sending updates on changes removes repeated
empty polls, but 20,000 recipients still require 20,000 deliveries per broadcast.
Do not enable per-viewer polling as a fallback at this scale without a request budget.

Primary references:
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
