# S Tournament OS — Architecture v2 (2026-10-22)
## Product boundary and status
Multi-tenant B2B SaaS for independent sports organisers, not a globally privileged badminton controller. This is a target design, **not a deployed database migration**. Existing badminton scoring and production auction data must remain untouched through rollout. Draft plan prices are experiments; no merchant integration or commercial charges are enabled.

## Research / commercial constraints
- Vercel Hobby is not for commercial use: migrate to commercially eligible hosting before selling. https://vercel.com/docs/plans/hobby
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security ; Realtime Broadcast: https://supabase.com/docs/guides/realtime/broadcast
- Razorpay payment signatures and webhook verification: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/ and https://razorpay.com/docs/webhooks/validate-test/
- India privacy compliance: assess DPDP Act/Rules effective timetable, retention, consent/notice, breaches and cross-border transfers with counsel, using https://www.meity.gov.in/
- PCI scope: redirect to provider-hosted checkout; never store card or UPI credentials, personal payment secrets or provider stream keys.
- Tax/financial: confirm GST applicability, invoicing, refunds, consumer notices and domestic/international settlement with accountant/lawyer before charging.
- Billing plan offers and prices should be finalized through customer discovery, costing and finance review, not treated as verified market rates.

## Core architecture
**Modular monolith first** — Next.js UI + server APIs, isolated domain services, PostgreSQL in one Supabase project with RLS, Supabase Auth and Realtime; provider adapter for Razorpay first and Stripe if eligible. Adopt background jobs/queue only for outbox email, billing reconciliation, imports and reports once actual volume demands it. Use managed object storage for branding/portraits, CDN for immutable images, YouTube as video distribution. Do NOT relay high-bandwidth media through Vercel.

Domains:
1. Identity and organisations: users, organisations, memberships, scoped role bindings, invitations, invitations acceptance, verified staff, service accounts, permissions ledger.
2. Sport registry: versioned sport modules defining disciplines, participant configuration, scoring state/actions, validation, rules versions, statistics, overlays.
3. Competitions: tournaments, divisions, stages, entrant registrations, roster snapshots, games/fixtures, courts/fields/venues, time slots, brackets, standings, officiating.
4. Operations: bulk imports with dry run + rollback, schedules, staff, incidents, score corrections, irreversible audit event stream and idempotent commands.
5. Broadcasting: per-event channel registry with OBS-only expiring links, broadcast/overlay templates, organiser/sponsor assets, stream start state and public YouTube IDs.
6. Commerce: plans, catalogue versions, org subscriptions, checkout intents, invoices, payment attempts, refunds, entitlements, metering, webhook inbox and outbox.
7. Customer tools: support, onboarding, notices, export/delete, reports, configuration.

## Access hierarchy (do not use global profiles.role for new tenant permissions)
platform_operator: administer platform metadata, fraud/support access by audited break-glass only, NEVER automatic rights in tournament data.
organization_owner: billing and policy delegation for their own org.
organization_admin: org settings/staff except ownership transfer/payment operations without explicit grants.
sport_manager: sport scope within org, no other sports.
event_manager: named event scope.
registration_manager: participant and roster scope.
official: assigned fixture score actions only.
broadcast_manager: assigned events/broadcast destinations, never scorer.
viewer: anonymous public event pages only.
A user can belong to multiple orgs, with separate roles. Scope evaluation combines org_id, sport_id, event_id and explicit assigned match IDs. Server verifies session, membership, permission and entitlement **for each command**, with RLS as defence in depth; no authorisation from user_metadata. Revoke access immediately at the DB on next operation.

## Proposed additive schema (design — DO NOT EXECUTE DIRECTLY)
- organizations(id, slug unique, legal_name, display_name, billing_country, status, settings, timestamps)
- organization_memberships(org_id, user_id, status, joined_at) with unique(org_id,user_id)
- role_bindings(id, org_id, user_id, role, scope_kind, sport_id nullable, event_id nullable, granted_by, timestamps), check allowed scope/role combinations
- sports(id, key, name, engine_key), sport_rulesets(id,sport_id,version,schema_version,config jsonb, hash, immutable_after_use)
- events(id,org_id,sport_id,slug,timezone,venue_id,start/end,status,brand_id,ruleset_id,created_by), unique(org_id,slug)
- divisions, event_staff_assignments, participants, event_registrations, teams, roster_memberships, fixtures, fixture_sides, match_state, scoring_events(idempotency_key,actor,version,before,after), results, standings_snapshots
- venues, play_areas(id, venue_id, org_id, type, name) — no hard coded three courts
- broadcast_channels(org_id,event_id,area_id,public_video_id,status), overlay_templates, sponsor_slots, storage_assets
- billing_customers(org_id,provider,provider_customer_ref), plan_catalogue(id,version,currency,interval,price_minor_units,tax_policy,active), subscriptions(org_id,provider_subscription_id,plan_id,status,period), checkout_intents(org_id,attempt_ref,plan_version,amount_minor,currency,status,expires_at,created_by), payment_transactions(unique provider_payment_id), webhook_inbox(provider,event_id unique,received_at,processing_state,signature_verified_at,payload_hash), invoices, refunds, entitlements(org_id,feature,limit,value,status)
Every organisation-owned table requires org_id and test-covered RLS to block cross-tenant SELECT/INSERT/UPDATE/DELETE. Foreign keys must verify same-org parent relationships (composite FK or trusted checks) to prevent cross-tenant references. Index (org_id, event_id, status, scheduled_at) and partition/archive large append-only score events as needed; use EXPLAIN for hot paths. Do not add RLS policies allowing blanket authenticated reads. Public event data should use explicit published views/API projections, not unfiltered private tables.

## Sport module contract
Sport engine API: validateRules(version, config), initialState(entrants, rules), validateAction(actor, state, action), applyAction(previousState, action, rules) -> {state,events}, outcome(state), publicScoreboard(state), standingsRules(result), permittedFixtureKinds. Deterministic functions with no DB/network access; persistence wraps them in transactional optimistic version checks plus unique request IDs. Cricket innings/overs/extras; football timed periods/cards; badminton rally games and sets; athletics ranked heats/time/distance. Never infer sports semantics from generic a/b counters.

## Payments / secure order of operations
- Initial pricing page lists *proposed* Community, Event Pass, Organiser Pro, Enterprise. Event Pass ₹1,499 per event, Pro ₹2,999 monthly / ₹29,990 annually are positioning hypotheses **excluding applicable taxes** and not promises of features.
- Prices, plan IDs and tax calculations must be resolved on server. Use smallest currency units (paise) as integers; versions and invoice snapshots immutable.
- Org owner with billing permission creates pending checkout intent via authenticated server route. Generate provider order or hosted checkout only server-side, with idempotency key. No raw card info or keys in browser. Explicit consent to terms.
- Only trusted, signature-verified webhook transitions invoice/attempt/subscription state, inside a DB transaction, dedupe event ID, handle replay/out of order/partial payments/refunds. Never activate a plan based on redirect URL, browser success or arbitrary client callback.
- Subscription entitlement changes are derived from active invoices/subscription policy and provider settlement states, not UI toggles. Grace periods, disputes, refunds, expiry and cancellation require policy. Store separate immutable payment journal.
- Participant registration entry fees are a **different product** (marketplace settlement, merchant-of-record and organiser pay-out analysis needed). Do not treat organiser subscription as a pass-through payment.
- Payment implementation must be blocked until merchant KYB/KYC, current PSP agreement, webhooks, return URLs, legal docs, tax/invoice policy, secure secrets and testing are complete.
- No `PAYMENT_GATEWAY_ENABLED` fail-open defaults. Default is disabled, including in production. Use per-environment secrets and webhook rotation instructions.

## Delivery architecture / release milestones
M0: snapshot current badminton schema, backups, security baseline, scoring regression suite, staging project. Freeze major unrelated changes.
M1: additive org tenancy + invitation/membership/role bindings behind feature flag; seeded existing tournament to a single protected default organisation; verify owner continuity and auction handoff.
M2: sport engine extraction for badminton (identical results tests) and configurable competition formats; implement second sport as architectural proof.
M3: event-scoped public pages and admin/referee permission tests; migration and backward-compatible reads, dual-write only with reconciliation.
M4: broadcast studio and sponsorship templates; controlled signed overlay tokens and revocation.
M5: commercial onboarding and payment provider sandbox (no live charges), verified webhook inbox, subscription entitlements, invoice/refund pipeline; legal compliance and payments security review.
M6: load/reliability drills, RLS penetration tests (cross-org access), duplicate scoring requests, webhook replay tests, timezone/schedule edge cases, mobile referee offline/error handling, load simulations, backup restore drill; staged commercial hosting; owner sign-off.
M7: limited paid beta after merchant/legal/infra approval; telemetry, on-call runbook, support, usage caps, cost alerts, SLA policy.

## Quality / go-no-go
Release gates: unit rules engine tests for every sport; cross-tenant RLS integration tests; signed overlay expiry tests; match transaction concurrency and audit tests; E2E (login, owner invitation, sport manager denied cricket when badminton-only, referee assigned single match, results updates, checkout webhook duplicate/no signature); accessibility WCAG 2.2 AA audit; LCP, CLS, INP performance budgets; backup restore exercises and migration dry run; legal Terms, Privacy, Refund/Cancellation, Billing and Contact pages; status/incidents and support.
Metrics: registered orgs, activated organisers, events activated, scores/minute, realtime fanout delays, payment failures, webhook latency, tenant-access denials, p95 API latency, database connections and cost per active event.
Risk: existing schema assumes six teams, 18 per team, three courts, 11–30 rally scoring, single global owner. Rewriting old tables in place or granting global owner to newly invited staff will cause data exposure. Keep migration additive; migrate event-by-event with verified rollback. 
