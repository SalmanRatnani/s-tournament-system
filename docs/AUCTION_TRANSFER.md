# S Auction → S Tournament transfer (version 1)

## Export

The auction repository has a separate, read-only controller-only feature branch `feature/tournament-handoff-export` with a `/transfer-to-tournament` page and `/api/admin/tournament-export` download. The export is available only for a `LIVE`-mode auction in database status `ENDED`, after all six teams have exactly 18 final allocations in `team_players`. It does NOT modify auction data. It should be reviewed and merged by the auction owner after checking the preview in staging.

Use **Export to S Tournament** from the auction Main Controller menu (after the change is merged), choose the ended LIVE auction, and download `s-tournament-auction-<uuid>.json`.

## Import

1. Create a NEW tournament in the S Tournament app at `/admin/teams`. Do NOT manually create teams or matches beforehand.
2. Apply migrations 001, 002 and **003** on the standalone tournament Supabase database (never the auction project).
3. Sign in as owner/admin, go to `/admin/import-auction` and select the JSON.
4. Review all six teams and their 108 players. Press **Confirm & import rosters**.
5. Confirm the rosters and player photographs at `/players`. Set scoring at `/admin/scoring-rules` before creating rubbers.
6. Generate league fixtures at `/admin/fixtures`; 15 team ties in 5 rounds, top four into semifinals.

### What transfers

Export JSON includes stable auction team/player IDs, full names, player code, grade/category, captain and playing-captain flags, acquisition amount and type, age, achievements, playing centre, participation history, playing hand, team logos and player **image filename + HTTPS URL**. It intentionally omits phone numbers, private proof-document links, login credentials and DOB.

Image **bytes are NOT bundled**. Ensure images are on a durable, accessible HTTPS source. Temporary/signed URLs can expire, and private Supabase buckets or Google Drive links may require authenticated access. Copy approved photos to a public tournament media bucket if required before the event. Never export storage service keys.

### Safety

The import validates version and shape before writing. A privileged PostgreSQL transaction inserts teams and players together, or rolls back all rows on failure. Existing teams/fixtures block import. File size is capped at 2 MB. Import and scoring settings require owner/admin access. The auction code is read-only.

### Format (excerpt)

```json
{
  "format": "s-tournament-auction-handoff",
  "version": 1,
  "exported_at": "2026-10-20T12:00:00Z",
  "source": { "system": "s-auction-system", "auction_id": "<uuid>", "status": "completed" },
  "teams": [
    {
      "source_team_id": "<uuid>", "name": "Team A", "captain_name": "Player A",
      "logo_filename": "team-a.png", "logo_url": "https://example.org/team-a.png",
      "metadata": {},
      "players": [{
        "source_player_id": "<uuid>", "player_code": "P0001", "name": "Player A", "category": "A+",
        "image_filename": "p0001.jpg", "image_url": "https://example.org/p0001.jpg", "image_storage_path": null,
        "is_captain": true, "is_playing_captain": true, "auction_amount": 3000,
        "metadata": { "playing_hand": "Right", "acquired_via": "BID" }
      ]
    }
  ]
}
```

The actual file must contain six teams with 18 unique player records in each; this excerpt is not importable.
