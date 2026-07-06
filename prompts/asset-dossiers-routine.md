# Daily Asset Dossiers — canonical routine spec

The `daily-asset-dossiers` cloud routine (claude.ai/code/routines, runs ~21:45 UTC)
generates the single-asset dossiers rendered at `/nvidia`, `/bitcoin`, `/skhynix`,
`/micron`, `/nebius`, `/bloom-energy`, and `/coreweave`. **The routine
prompt lives in the cloud account, not in this repo** — this file is the in-repo
source of truth. To change what the routine does, edit the cloud prompt to match
this file; paste the sections below in directly.

## Each run, in order

1. Generate a dossier for **all seven desks** in the table below (BTC every day;
   the equities on their trading-session cadence — but still emit a "weekend
   review" file dated for the day even when markets are closed, carrying the last
   confirmed close forward, as the existing Saturday dossiers do).
2. Every dossier gets a first-class **`so_what`** block (see the so_what note at
   the bottom). This is no longer optional — the For You feed is the home page.
3. Drain the **lite coverage queue** (`data/coverage-queue.json`) — write/refresh
   a lite dossier per requested name (see "Lite coverage queue").
4. `git add` the new `data/asset-daily/**`, `data/asset-lite/**`, and the updated
   `data/coverage-queue.json`; commit; **push to `deploy`** so Vercel ships. Files
   on disk that aren't pushed never reach the site.

## The seven desks

| asset id | symbol | page | currency | cadence | beat |
|----------|--------|------|----------|---------|------|
| `nvda`    | NVDA      | /nvidia       | $ (USD) | US sessions | AI-compute bellwether |
| `btc`     | BTC       | /bitcoin      | $ (USD) | every day   | on-chain fields; weekends too |
| `skhynix` | 000660.KS | /skhynix      | ₩ (KRW) | KRX sessions| HBM/AI-memory twin of NVDA |
| `mu`      | MU        | /micron       | $ (USD) | US sessions | HBM/DRAM, AI-memory super-cycle; SK Hynix twin |
| `nbis`    | NBIS      | /nebius       | $ (USD) | US sessions | AI neocloud; the Situational Awareness bottleneck play |
| `be`      | BE        | /bloom-energy | $ (USD) | US sessions | fuel cells for AI data centers; Aschenbrenner's top long |
| `crwv`    | CRWV      | /coreweave    | $ (USD) | US sessions | flagship AI neocloud; $99B backlog; Aschenbrenner long |

Each writes to `data/asset-daily/<asset>/<YYYY-MM-DD>.json` with `"asset"`,
`"symbol"`, `"name"`, and `currency_symbol` (default `$`, `₩` for SK Hynix) set
per the table. Schema is `lib/asset-daily.ts` (fields listed at the bottom).

## Per-desk beat notes

> **Micron** (`mu`, /micron) — the HBM/DRAM leader and the cleanest read-through
> to our SK Hynix desk. Track the AI-memory super-cycle, gross-margin trajectory,
> HBM4 ramp into Nvidia's Vera Rubin, and the fiscal-quarter prints. Fiscal Q3
> 2026 (reported 2026-06-24) was a blowout: EPS $25.11, revenue $41.46B, Q4 guide
> ~$50B at ~86% GM.
>
> **Nebius** (`nbis`, /nebius) — a high-beta AI-neocloud, the public proxy for the
> compute-and-power bottleneck the Situational Awareness page tracks. Watch the
> ~$47B backlog (Microsoft, Meta), the $20–25B FY26 capex / dilution risk, and
> whether Aschenbrenner's next 13F initiates a NBIS position. Sibling to CRWV (the
> neocloud complex trades together). Cross-reference /situational-awareness.
>
> **Bloom Energy** (`be`, /bloom-energy) — the fuel-cell maker that became the
> AI-data-center power trade of 2026 (~280% YTD) and Aschenbrenner's largest
> disclosed long. Track the Oracle 2.8GW master agreement / Project Jupiter, the
> $5B Brookfield partnership, backlog conversion (~$20–24B), margins, and the
> quarterly prints. Bellwether for the power-for-AI group; a high-beta momentum
> vehicle that moves hard both ways — respect the volatility. Cross-reference
> /situational-awareness.
>
> **CoreWeave** (`crwv`, /coreweave) — the flagship AI neocloud renting Nvidia
> GPUs to OpenAI, Anthropic and Meta. Track the ~$99B revenue backlog, FY26
> revenue guide ($12–13B), the $31–35B capex plan and how it's financed (debt /
> GPU-backed facilities / equity — the core risk), losses/FCF timing, and the
> quarterly prints. Sibling to NBIS; a disclosed Aschenbrenner long —
> cross-reference /situational-awareness.

## Lite coverage queue — desks requested from the For You feed

The home-page "For You" feed lets a user add any ticker. When they ask for
coverage on a name we don't run a deep desk for, it lands in
`data/coverage-queue.json` as `{ "symbol", "name", "requestedAt", "status":
"queued" }`. Each run, after the deep desks above:

1. Read `data/coverage-queue.json`. For every entry with `status: "queued"`,
   write a **lite dossier** to `data/asset-lite/<SYMBOL>.json` (uppercase
   symbol, e.g. `data/asset-lite/PLTR.json`), then flip that entry's `status`
   to `"lite"`.
2. Re-write the lite dossier for any name whose file already exists and whose
   queue `status` is `"lite"`, so the read stays current (same daily cadence).

A lite dossier is intentionally lighter than a deep one — no positioning,
levels, or dedicated page. Shape (see `lib/lite-dossier.ts`):

```
{
  "symbol": "PLTR",                 // uppercase, matches the holding
  "name": "Palantir Technologies",
  "date": "<YYYY-MM-DD>",
  "generated_at": "<ISO>",
  "is_seed": false,                 // true only for placeholder seeds
  "decision": { "action": "buy|hold|sell|step_aside",
                "conviction": "low|medium|high",
                "rationale": "1-2 plain sentences — the so-what for a holder" },
  "bull": "the single strongest bull point",
  "bear": "the single strongest bear point",
  "snapshot": { "price": 0, "change_pct": 0, "currency_symbol": "$" },  // optional
  "factors": ["rates","risk","dollar","crypto","oil"]   // optional; the subset that moves it
}
```

Keep `rationale` honest: if a name is outside competence, say so and set a
low-conviction `hold`/`step_aside` rather than inventing a view. Promotion to a
deep desk (the table above) is a human call, never automatic. Commit
`data/asset-lite/` and the updated `data/coverage-queue.json` to `deploy` with
the rest of the run.

## Schema fields (from lib/asset-daily.ts)

`asset, symbol, name, date, generated_at, is_seed, currency_symbol?, day_winner
(bulls|bears|flat), day_summary, long_pnl?, short_pnl?, decision{action(buy|hold|
sell), conviction(low|medium|high), horizon, rationale}, so_what?{line, bull?, bear?},
snapshot{price, change_pct,
change_abs?, prev_close?, day_high?, day_low?, week52_high?, week52_low?, volume?,
market_cap?, extra[]?}, positioning{iv?, iv_note?, put_call?, short_interest?,
max_pain?, notable_flow?}, what_traders_are_doing, news[], outlook{short_term,
long_term}, bull_case[], bear_case[], key_levels[], catalysts[], analysis?`

> Note: the positioning panel now tolerates `null` IV / put-call, so newly-listed
> names render cleanly without a fake options chain.

> **so_what** (required on every deep dossier — the For You feed is the home page):
> write `so_what.line` as one plain
> sentence answering "what does today's call mean if I hold this?" — no jargon,
> the same register as the briefings. `so_what.bull` / `so_what.bear` are tight
> one-liners (vs. the longer `bull_case` / `bear_case` essays). The home-page For
> You feed prefers these; if omitted it falls back to the first sentence of
> `rationale` and `bull_case[0]` / `bear_case[0]`. Lite dossiers don't need it —
> their `rationale` + `bull` / `bear` already serve that role.
