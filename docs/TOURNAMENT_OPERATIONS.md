# Six-team badminton format — Operations guide

- 6 team rosters × 18 registered players = 108 registered players.
- All 6 teams play each other once: 5 league rounds × 3 ties = 15 team ties.
- The fixture generator distributes 3 ties per round across Court 1, 2 and 3. Courts may need resequencing if venue timing changes.
- By default a team tie is decided by the first team to win 3 rubbers. Up to 5 singles/doubles rubbers may be created. A rubber uses standard best-of-3 badminton games to 21, win by 2, capped at 30.
- Teams receive 2 league points per tie won. Ranking uses points, then rubber difference, rubbers won, then alphabetical name. **Confirm official head-to-head and tie-break policy before tournament day.**
- Top 4 advance after all 15 league ties are completed. SF1 #1 vs #4; SF2 #2 vs #3. Winner SF1 faces winner SF2 in the final.
- No player names or results are fabricated in production. Enter real team names and real registered athletes before generating fixtures.
- Parent team ties must **not** be scored point-by-point. Individual rubbers are scored by their assigned referees in `/referee`. The parent tie result updates from completed child rubbers.
- Parent team ties do not hold courts active; only individual rubbers can be live on any court.
- Make sure the intended rubber is assigned to each referee. An organizer starts its status as LIVE, and then the assigned referee can award and undo points.
- Completed rubber points can be corrected only within the existing server scoring restriction; match events are audit-logged. Organizer incident workflows and manual result appeal approvals should be added before a high-stakes public tournament.

## Expected controller workflow

1. Owner creates tournament in `/admin/teams`.
2. Register exactly six real teams and 18 real players per team.
3. Generate the 15 team ties in `/admin/fixtures`.
4. Create up to 5 playing rubbers inside each team tie.
5. Have staff register at `/register`, then owner/admin promotes referee accounts through `/admin/users`.
6. Use `/admin/referees` to assign referee-to-rubber access.
7. Start a rubber through admin controls in `/referee`, then award points on mobile devices. Changes reach public pages and OBS overlays over Supabase Realtime.
8. After 15 completed league ties, generate semifinals, then the final after both semis finish.

## Current limitations

This release has no automated match times, no automatic rescheduling, no team-tie lineup validation for player reuse across rubbers, and no penalty/forfeit/retirement workflows. The tiebreak rules are an initial default. It has not been tested against a connected Supabase or live OBS deployment and needs a real multi-device dress rehearsal before being trusted at a tournament.
