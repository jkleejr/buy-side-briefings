# Opportunities — Daily Update Routine

This prompt drives the daily morning opportunities update. It runs every US weekday at 8:00 AM ET (12:00 UTC), about 1 hour after the morning briefing is published — so the morning briefing exists when this routine reads it.

The goal of this routine is two-fold:

1. **Refresh the status of every existing active opportunity** against current prices (mark `target_hit`, `stopped_out`, or `expired` as appropriate).
2. **Generate 2–3 new opportunities** that reflect today's setup, sourced from the morning briefing + fresh research.
3. **Write a daily snapshot** so the user can audit the state of the slate every day forever.

The website at https://[deployed-site]/opportunities reads all the JSON files in `data/opportunities/`. The history view at `/opportunities/history` reads all the snapshot files in `data/opportunities-snapshots/`. Both pages must keep working.

---

## File layout

```
data/
  opportunities/
    <id>.json              # one file per opportunity (persistent — never deleted)
  opportunities-snapshots/
    YYYY-MM-DD.json        # one snapshot per day this routine runs
```

## Opportunity JSON schema (`data/opportunities/<id>.json`)

```json
{
  "id": "long-NVDA-post-earnings-2026-05-21",
  "title": "Long NVDA — Post-Earnings Continuation",
  "ticker": "NVDA",
  "asset_class": "equity",
  "category": "catalyst",
  "direction": "long",
  "conviction": "medium",
  "time_horizon": "4-8 weeks",
  "current_price": 226.0,
  "entry": "...",
  "stop_loss": "...",
  "targets": ["...", "...", "..."],
  "risk_reward": "1:3",
  "position_size_pct": 4,
  "catalyst": "...",
  "thesis": "...",
  "bull_case": "...",
  "bear_case": "...",
  "invalidation": "...",
  "sources": [{"label": "...", "url": "..."}],
  "created_at": "2026-05-21",
  "expires_at": "2026-07-15",
  "status": "active",
  "tags": ["AI", "semis", "..."],
  "outcome": null
}
```

Allowed enum values:
- `asset_class`: equity, etf, crypto, commodity, options, fx, fixed_income, pair
- `category`: momentum, value, catalyst, contrarian, options, pair_trade, macro, sector, event, thematic
- `direction`: long, short, long_vol, short_vol, pair
- `conviction`: low, medium, high
- `status`: active, triggered, stopped_out, target_hit, expired, thesis_broken

When closing an opportunity, set `status` to one of `target_hit | stopped_out | expired | thesis_broken` AND populate the `outcome` field:

```json
"outcome": {
  "closed_at": "2026-05-30",
  "final_price": 245.0,
  "return_pct": 8.4,
  "outcome_label": "Target 1 hit",
  "note": "NVDA cleared $245 intraday on May 30; first target taken."
}
```

`return_pct` is in % units (8.4 means +8.4%), positive for a winning trade regardless of direction. For shorts, a price decline produces a positive return.

## Daily snapshot schema (`data/opportunities-snapshots/<YYYY-MM-DD>.json`)

```json
{
  "date": "2026-05-22",
  "generated_at": "2026-05-22T12:05:33Z",
  "summary": "2 new ideas added on AI capex + Iran de-escalation read; NVDA continuation on track ($232); MU added to active slate. SPX closed +1.2% Thursday on NVDA-led rally.",
  "active_ids": ["long-NVDA-post-earnings-2026-05-21", "long-SMH-..."],
  "new_today_ids": ["long-X-...", "short-Y-..."],
  "closed_today": [
    {
      "id": "short-XLE-...",
      "status": "stopped_out",
      "final_price": 62.1,
      "return_pct": -7.0,
      "note": "WTI re-spiked to $104 on missile strike headline; stop triggered."
    }
  ],
  "current_prices": {
    "long-NVDA-post-earnings-2026-05-21": 232.0,
    "long-SMH-ai-semis-readthrough-2026-05-21": 548.0
  }
}
```

The `current_prices` map captures each active opportunity's current price on the snapshot date — used by the history page to show what prices looked like that day.

---

## Steps (every run)

1. **Checkout the deploy branch and pull latest**
   ```
   git checkout deploy && git pull origin deploy
   ```

2. **Read today's morning briefing** at `data/briefings/markets/<today>-morning.mdx` (use US/Eastern for the date — `TZ='America/New_York' date +%Y-%m-%d`). If it doesn't exist yet (briefing routine running late), wait 60s and retry once; if still missing, proceed without it but flag in the summary.

3. **Load every existing opportunity** from `data/opportunities/*.json`. Sort by `created_at` desc.

4. **For each `status: "active"` opportunity, refresh status:**
   a. Look up current price via WebSearch (try Yahoo Finance, Google Finance, CoinMarketCap for crypto). Cite the source URL.
   b. Parse the entry / stop_loss / targets fields (they're free-form text but contain explicit price levels).
   c. **Check stop_loss first:** if the current price triggers the stop (e.g., daily close below $215 for an NVDA long with $215 stop), set `status: "stopped_out"`, populate `outcome` with `return_pct` computed from the reference `current_price` field (or entry midpoint if reference is missing).
   d. **Check targets:** if the current price has hit any target zone, set `status: "target_hit"`. Note which target hit in `outcome.outcome_label` (e.g., "Target 1 hit at $245").
   e. **Check expiration:** if `expires_at` is past today AND no target/stop hit, set `status: "expired"`.
   f. **Check invalidation conditions** (the prose `invalidation` field can describe non-price triggers like "FOMC signals rate cut" — use judgment).

5. **For each opportunity that changed status:**
   - Update the JSON file on disk
   - Record in the snapshot's `closed_today` array

6. **Identify 2–3 NEW opportunities** based on today's setup:
   - Read the morning briefing's verdict + trade setups + don't_buy list as starting points
   - Cross-reference with current market state (use WebSearch)
   - Each new opp must follow the JSON schema above with a unique `id` ending in today's date (`<direction>-<TICKER>-<short-thesis>-<YYYY-MM-DD>`)
   - Diverse direction / asset class / horizon — don't pile 3 long-tech ideas on the same day
   - Write each as a new JSON file under `data/opportunities/`

7. **Write the daily snapshot file** to `data/opportunities-snapshots/<today>.json`:
   - `date`: today in US/Eastern (YYYY-MM-DD)
   - `generated_at`: ISO timestamp UTC
   - `summary`: 1–2 sentence English summary of the day's slate state (any closures, what was added, broader regime read)
   - `active_ids`: list of all `id`s with `status: "active"` after the refresh
   - `new_today_ids`: list of `id`s of opportunities created today
   - `closed_today`: list of closures from step 5
   - `current_prices`: map of opportunity id → current price for every active opp

8. **Commit and push:**
   ```
   git add data/opportunities/ data/opportunities-snapshots/
   git commit -m "Daily opportunities update for <YYYY-MM-DD>"
   git push origin deploy
   ```

## House style for opportunity text

- **No fabricated numbers.** Every price level, target, or estimate must be sourced from WebSearch results. Cite the source URL in the `sources` array.
- **Theses are 2–4 paragraphs**, dense but readable. They must answer: WHY now, WHY this asset, WHAT changes the thesis, WHO is the counter-party (i.e., what does the bear think).
- **Position sizes** range from 1% (asymmetric tail bet) to 8% (highest conviction). Default mid-range is 4%.
- **Use conviction sparingly.** `high` requires: (1) multi-leg supporting evidence (price + fundamental + macro), (2) clean ≥3:1 R/R, (3) named catalyst within horizon. Most ideas should be `medium`.
- **Stop losses must be tight** for `low` conviction ideas (5–10% from entry), can be wider for `high` conviction (12–18%).
- **Targets in 3 tiers**: first target = quickest profit-take (achievable in 25% of horizon), second = base case, third = blue-sky.
- **Avoid restating yesterday.** If yesterday's opportunities still hold, that's fine — just don't create duplicates with a new `created_at` date. New opportunities should reflect NEW catalysts or shifts in regime.

## Critical rules

- Push to `deploy` branch ONLY. Never push to `main`. Vercel deploys from `deploy`.
- All cited numbers must be REAL — pull from WebSearch, never fabricate.
- Never delete an opportunity JSON file — update its status to closed instead. The persistent record is the whole point.
- If git push fails, retry once then exit cleanly with the commit local. Do not amend or force-push.
- Generate fresh lowercase UUIDs for any internal IDs you need; the opportunity `id` should be a human-readable slug like `long-NVDA-post-earnings-2026-05-21` (lowercase, hyphens, terminated with creation date).
