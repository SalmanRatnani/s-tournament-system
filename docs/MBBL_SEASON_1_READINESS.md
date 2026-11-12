# Mira-Bhayandar Badminton League — Season 1 deployment notes

Official source: six organiser-supplied team announcement posters, plus a seven-page MBBL Season 1 Rulebook PDF.

## Production seeding outcome (2026-11-06)
- Tournament Supabase project: separate from the auction system.
- One MBBL Season 1 tournament initialised as `upcoming`.
- Six teams and **108 real named player records**, exactly 18 categories per team.
- `tournament_rules.format_key = mbbl-s1`, `rubbers_per_tie = 9`, `default_best_of = 1`, `default_winning_score = 15`.
- All player names and categories come from the announcement posters, not from auction bidding history.
- Owner labels stored as `teams.owner_names`; owner labels do not grant staff permissions.
- The imported profiles contain no fabricated captain flags, auction prices, team auction IDs, or player photographs.
- No fixtures, completed matches or official game points were inserted.
- Live nine-game referee scoring has NOT been enabled.

## Why the legacy system is disabled
The initial app's team ties had 5 rubbers, a +2-point-per-team-tie league table, and 3-rubber win-conditions. The official MBBL rules require nine *compulsory doubles games* with variable **overall team points** and a separate playoff tie-break, not a best-of-five match.
The REST endpoints for legacy league generation and legacy rubber creation reject tournaments whose names begin with `Mira-Bhayandar Badminton League`, and the UI directs the Main Controller to the new /admin/mbbl interface.
Before activating official match play, replace this temporary name-based compatibility guard with stable `tournament_rules.format_key` checks; test every authority path and update all generic fixture/stats/overlay consumers.

## Rules as written in supplied PDF
1. 6-team round robin, 5 ties/team, 15 league ties; top four qualify; semifinals 1 v 4 and 2 v 3.
2. Each team 18 players: 4 A incl A+, 5 B incl B1, 4 C incl C1, K1 K2, W1 W2, G1.
3. Nine doubles games in fixed category order: A+ with A, other two A; B1 with B, two other B; C1 with C, other two C; K1 with K2 or W; last two K/W; G1 with remaining B. No player repeats except approved in-day substitutions.
4. Each normal game is a single game to 15, no in-game change of ends; one pre-tie toss fixes playing sides for all nine games.
5. Each team independently designates Trump Games. League: three via separate chit draws. Semifinals: two nominated by owner/captain. Final: one. A team receives regular win +1, loss 0; own Trump win +2, own Trump loss -1. One game may be Trump for both, neither or only one team.
6. League ranking: **overall team points**, then games won, then total rally points difference. Remaining ties are resolved by an independent best-vs-best doubles game to 21 (not included in regular standings); head-to-head not used.
7. Knockout ranking uses total tie overall points (including trumps & penalties). After nine games equal points trigger a continuous relay to 30 with A pair until first team reaches 10, B pair until 20, then C pair until first side reaches 30. No repetition of relay players.
8. Only owner/captain may raise disputes. Umpire-authorised misconduct deducts -1 overall team point, separate from game win/trump outcome.
9. Pre-event withdrawals: organiser-first replacement; if unavailable, captain/owner suggestion needs 4 of 7 votes (six owners + organiser). Replacement must reside in Mira-Bhayandar.
10. Day-of no-show A/B replacement table: A+→A3/B1; A1→B1/B2; A2→B2/B3; A3→B3/B4; B1→B5/C1; B2→C1/C2; B3→C2/C3; B4→C3/C4; B5→C4/G1.
11. K/W/G no-shows cause 15–7 walkover to opposing team. For the forfeiting team, do not assess the normal -1 Trump loss deduction.

### Organiser clarification — 11 November 2026
The organiser confirmed two-point deuce after 14–14, with no golden point. Ordinary games require a 15-point target and a two-point lead, without a sudden-death cap. The deuce migration records this in tournament metadata and removes the previous scoring block. The 30-point relay is a separate rule. Prepare a real tie and assign its official before the owner starts play.

## Interfaces
- /mbbl — public category roster and format information.
- /admin/mbbl — private lineup/Trump selector, category validation and **sandbox** result calculator. This is **not** a DB-backed scoreboard.
- /teams and /players — existing public roster data from the real tournament DB.
- /admin/fixtures and legacy /api/admin/tournament — explicitly disabled for MBBL match generation until new engine is integrated.
- /admin/production — 3-court OBS overlays, currently generic scoreboard without nine-game tie point indicators.
- /mbbl/rules — expanded rulebook reading interface.

## Launch gates
- Confirm source spellings, poster logos and organizer rights before public promotion.
- Deuce is confirmed. Rehearse tie-game pause/resume/undo on the actual referee phones.
- Build transactional MBBL tie/rubber/Trump/penalty/relay state, event logs, authenticated controller/referee APIs, realtime subscriptions and court overlays.
- Validate 9 pair approvals, per-team independent Trump secrecy until confirmed, lineup changes, A/B replacements, no-show walkovers, and stage-specific finalization.
- Add full official standings and relay referee scoring; use a distinct ranking algorithm for this event.
- Complete a rehearsal across 3 courts, phone officials, spectators, and OBS before tournament day.
