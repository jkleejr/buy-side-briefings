# Daily Asset Dossiers — routine reference + SpaceX addendum

The `daily-asset-dossiers` cloud routine (claude.ai/code/routines, runs ~21:45 UTC)
generates the single-asset dossiers rendered at `/nvidia`, `/bitcoin`, `/skhynix`,
and now **`/spacex`**. Its prompt lives in the cloud account, **not** in this repo —
so adding an asset requires editing the routine there. This file is the in-repo
source of truth for what that routine should cover.

## Assets to generate each run

| asset id | symbol | page | currency | trades | notes |
|----------|--------|------|----------|--------|-------|
| `nvda`    | NVDA   | /nvidia  | $ (USD) | US sessions      | AI-compute bellwether |
| `btc`     | BTC    | /bitcoin | $ (USD) | every day        | on-chain fields; weekends too |
| `skhynix` | 000660.KS | /skhynix | ₩ (KRW) | KRX sessions  | HBM/AI-memory twin of NVDA |
| `spcx`    | SPCX   | /spacex  | $ (USD) | US sessions      | IPO'd 2026-06-12; Starlink/Starship megacap |
| `mu`      | MU     | /micron  | $ (USD) | US sessions      | **NEW** — HBM/DRAM, AI-memory super-cycle; SK Hynix twin |
| `nbis`    | NBIS   | /nebius  | $ (USD) | US sessions      | **NEW** — AI neocloud; the Situational Awareness bottleneck play |
| `be`      | BE     | /bloom-energy | $ (USD) | US sessions | **NEW** — fuel cells for AI data centers; Aschenbrenner's top long |
| `crwv`    | CRWV   | /coreweave | $ (USD) | US sessions | **NEW** — flagship AI neocloud; $99B backlog; Aschenbrenner long |

## Action required in the cloud routine

Add SpaceX to the asset loop. The exact addition to the routine prompt:

> Also generate a **SpaceX** dossier each US trading day. Write it to
> `data/asset-daily/spcx/<YYYY-MM-DD>.json` with `"asset": "spcx"`,
> `"symbol": "SPCX"`, `"name": "SpaceX"`, `currency_symbol` defaulting to `$`.
> SpaceX IPO'd June 12, 2026 (largest IPO ever — $135 offer, ~$75B raised,
> ~$1.75T valuation). It is newly listed, so there is little/no options chain
> or 52-week history yet — set unknown positioning fields (`iv`, `put_call`)
> to `null` with an honest note rather than inventing them. Anchor key levels
> on the IPO range (offer $135, debut high $176.52, debut close $160.95).
> Cross-reference TSLA as the Musk-proxy and the AI/risk-on tape where relevant.
> Track catalysts: first earnings (~Sept 2, 2026) and the 180-day lock-up
> expiry (~Dec 9, 2026).

Also add **Micron** and **Nebius** to the asset loop each US trading day:

> Generate a **Micron** dossier to `data/asset-daily/mu/<YYYY-MM-DD>.json` with
> `"asset": "mu"`, `"symbol": "MU"`, `"name": "Micron Technology"`. The
> HBM/DRAM leader and the cleanest read-through to our SK Hynix desk — track the
> AI-memory super-cycle, gross-margin trajectory, HBM4 ramp into Nvidia's Vera
> Rubin, and the fiscal-quarter prints. Fiscal Q3 2026 (reported 2026-06-24) was
> a blowout: EPS $25.11, revenue $41.46B, Q4 guide ~$50B at ~86% GM.
>
> Generate a **Nebius** dossier to `data/asset-daily/nbis/<YYYY-MM-DD>.json` with
> `"asset": "nbis"`, `"symbol": "NBIS"`, `"name": "Nebius Group"`. A high-beta
> AI-neocloud — the public proxy for the compute-and-power bottleneck the
> Situational Awareness page tracks. Watch the ~$47B backlog (Microsoft, Meta),
> the $20–25B FY26 capex / dilution risk, and whether Aschenbrenner's next 13F
> initiates a NBIS position. Cross-reference /situational-awareness.
>
> Generate a **Bloom Energy** dossier to `data/asset-daily/be/<YYYY-MM-DD>.json`
> with `"asset": "be"`, `"symbol": "BE"`, `"name": "Bloom Energy"`. The
> fuel-cell maker that became the AI-data-center power trade of 2026 (~280% YTD)
> and Aschenbrenner's largest disclosed long. Track the Oracle 2.8GW master
> agreement / Project Jupiter, the $5B Brookfield partnership, backlog
> conversion (~$20–24B), margins, and the quarterly prints. Bellwether for the
> power-for-AI group; cross-reference /situational-awareness.
>
> Generate a **CoreWeave** dossier to `data/asset-daily/crwv/<YYYY-MM-DD>.json`
> with `"asset": "crwv"`, `"symbol": "CRWV"`, `"name": "CoreWeave"`. The flagship
> AI neocloud renting Nvidia GPUs to OpenAI, Anthropic and Meta. Track the
> ~$99B revenue backlog, FY26 revenue guide ($12–13B), the $31–35B capex plan and
> how it's financed (debt / GPU-backed facilities / equity — the core risk),
> losses/FCF timing, and the quarterly prints. Sibling to NBIS (the neocloud
> complex moves together); a disclosed Aschenbrenner long — cross-reference
> /situational-awareness.

Everything else (schema in `lib/asset-daily.ts`, the `data/asset-daily/<asset>/`
layout, commit + push to `deploy`) is identical to the existing assets.

## Schema fields (from lib/asset-daily.ts)

`asset, symbol, name, date, generated_at, is_seed, currency_symbol?, day_winner
(bulls|bears|flat), day_summary, long_pnl?, short_pnl?, decision{action(buy|hold|
sell), conviction(low|medium|high), horizon, rationale}, snapshot{price, change_pct,
change_abs?, prev_close?, day_high?, day_low?, week52_high?, week52_low?, volume?,
market_cap?, extra[]?}, positioning{iv?, iv_note?, put_call?, short_interest?,
max_pain?, notable_flow?}, what_traders_are_doing, news[], outlook{short_term,
long_term}, bull_case[], bear_case[], key_levels[], catalysts[], analysis?`

> Note: the positioning panel now tolerates `null` IV / put-call, so newly-listed
> names (like SPCX) render cleanly without a fake options chain.
