# MBBL Scoring + High Viewer Traffic: Infrastructure Runbook

## Production topology
Spectators -> CDN (Vercel, or Railway behind an external CDN) -> /api/public/scoreboard
-> server-only Supabase project (privileged read, scoped JSON projection).
This endpoint is identical for all spectators. 3-second shared cache, up to 9-second stale
grace; clients poll on visible tabs only, every 5–12 seconds. No spectator opens Postgres
Realtime or downloads full live tables on their own.

Referee -> authenticated API -> Supabase service role -> private atomic Postgres RPC ->
mbbl_score_events audit. Referees do not share their score writing keys with viewers.
OBS signed links remain server-verified, never public. YouTube hosts all 3 videos, not Railway.
Other public uses (fixtures, team rosters) should use the same shared snapshot.

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
1. Organizer confirms ambiguous 14–14 game-ending rule and any score cap.
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
8. Remove stale dependency lockfile mismatch; use npm ci and pin dependencies after
   regenerating the lockfile. Configure alerts for failed deployments.

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
