# Investor Dashboard — PRD

**Working name:** Buy-Side Briefings
**Status:** Greenfield project, bootstrapped from prototype in `discord-briefings` repo
**Author:** John (with Claude)
**Last updated:** 2026-05-15

---

## 1. Vision

A public-facing investor dashboard that surfaces opinionated, cited, and (over time) auditable market analysis to self-directed investors. The defining voice: **buy-side analyst, not sell-side** — tells you when *not* to buy as much as when to buy. Mandatory bear case on every bullish call. Conviction in both directions or no conviction at all.

The dashboard is organized around **three investing horizons** (short / mid / long term) so a visitor can quickly orient on the question they actually have: *Am I positioned for tomorrow? Is the regime changing? What part of the cycle are we in?*

---

## 2. Problem

Most retail-facing market commentary is sell-side cheerleading: every dip is a buying opportunity, every rally is just getting started, and the only verdict is "hold." Self-directed investors who want sharper analysis are forced to stitch together Bloomberg/Stratechery/Substack/Reddit/Twitter — none of which give them a single, opinionated, time-stamped view they can audit later.

This site exists to be that single view: one verdict per session window, cited, with a forward bear case, all three horizons of context, and a public track record that compounds over time.

---

## 3. Target user

**Primary (you):** a self-directed retail investor who already follows AI, semis, quantum, and crypto; manages their own brokerage account actively; reads Stratechery/The Diff-level content; tired of hedged AI-summary newsletters.

**Secondary (eventual public):** ~30–45 year old self-directed investors who pay for at least one premium newsletter, manage their own portfolio, want sharper opinions than Robinhood Snacks but aren't paying for Bloomberg Terminal.

**Not the user:** day-traders looking for tick-by-tick signals; passive index investors; people seeking personalized financial planning.

---

## 4. Goals & non-goals

**Primary goals**
- Become *your* daily go-to morning read in place of stitching multiple sources.
- Build a public Buy Verdict track record that compounds credibility over 6–12 months.
- Stay free to operate (no Anthropic API costs in steady state — manual generation via Claude Max).

**Secondary goals**
- Eventually attract 100–500 unique returning visitors per week (no monetization yet).
- Build an email list of investors who want a weekly digest.

**Explicit non-goals (for v1)**
- Not personalized financial advice. Never recommends specific position sizes.
- Not a brokerage, not a portfolio tracker.
- Not auto-trading or signal-as-a-service.
- No paywall. No paid tier in v1.
- Not chasing real-time intraday updates — the data refresh cadence is *trading session*, not millisecond.

---

## 5. Success criteria

- **You use it daily** within 30 days of launch (the only metric that matters short-term).
- The site is publicly indexed (SEO-discoverable) and has working `/about`, `/track-record`, disclaimers.
- 10+ Buy Verdicts logged with timestamps and post-hoc S&P comparison within 60 days.
- Lighthouse score ≥90 on Performance / SEO / Accessibility.
- Operating cost under $1/month (Vercel free tier + FRED free key + Yahoo unofficial).

---

## 6. Core features

Features marked **[PROTOTYPED]** were built in the `discord-briefings/web/` directory and should be ported over. Features marked **[NEW]** are unbuilt.

### Dashboard layout (homepage)

- **[PROTOTYPED]** Live ticker strip across the top: S&P 500, NDX, VIX, 10Y yield, DXY, BTC, ETH, Gold, WTI. Sourced from Yahoo Finance with 60s revalidation.
- **[PROTOTYPED]** Latest Buy Verdict hero card: 🟢/🟡/🟠/🔴 + label + conviction + 4–6 cited supporting data points + relative timestamp.
- **[PROTOTYPED]** Three horizon sections, stacked, each with a framing question:
  - **📅 Short term · Days to 2 weeks · "Am I positioned for tomorrow?"**: market snapshot grid, regime risk bars, crypto panel (BTC + ETH + sparklines)
  - **📆 Mid term · 1 to 3 months · "Is the regime changing?"**: sentiment/valuation panel (AAII, Fear & Greed, fwd P/E, Shiller CAPE), live 11-ETF sector rotation table
  - **🗓️ Long term · 6 months+ · "What part of the cycle are we in?"**: Fed & Macro panel (FRED-sourced), Cycle panel (ISM, GDP, Bitcoin halving)
- **[PROTOTYPED]** Recent briefings list (5 most recent across routines)

### Additional pages

- **[PROTOTYPED]** `/briefings` — full archive
- **[PROTOTYPED]** `/briefings/[routine]/[slug]` — full markdown briefing with GFM tables, citation links, verdict header
- **[PROTOTYPED]** `/track-record` — verdict count tiles + table of every verdict with rationale
- **[PROTOTYPED]** `/watchlist` — 10 mega-caps with live Yahoo quote + briefing sentiment annotation
- **[PROTOTYPED]** `/about`, `/privacy`, `/terms` with disclaimers
- **[NEW]** `/track-record` enhancement: S&P chart with verdict markers overlaid; auto-scoring at +1d / +5d / +20d using yahoo-finance2 historical
- **[NEW]** Subscribe form UI (the `/api/subscribe` route exists; the form doesn't)
- **[NEW]** SEO: sitemap.xml, robots.txt, per-page Open Graph metadata, OG image generator
- **[NEW]** `/politics` page once politics briefings have their own UI treatment (currently they share the briefings UI)

### Briefing generation flow

The dashboard is **manually fed** by Claude (via Claude Max — zero API cost):

1. User asks Claude in chat: *"run the morning markets briefing"*
2. Claude does `web_search` research per the prompt template
3. Claude generates the readable markdown briefing for chat consumption
4. Claude also writes two files into the dashboard repo:
   - `data/briefings/<routine>/<date>-<window>.mdx` (the readable markdown + frontmatter)
   - `data/verdicts/<routine>-<date>-<window>.json` (the structured verdict atoms)
5. User commits + pushes → Vercel auto-deploys → dashboard reflects new data within ~60s

**The prompts that drive Claude's generation are part of the repo** (under `prompts/`) and are versioned alongside the site.

---

## 7. Technical architecture

### Stack
- **Framework:** Next.js 16+ (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts (for Phase 2 verdict-marker chart)
- **Markdown:** react-markdown + remark-gfm (no MDX compiler needed)
- **Live quotes:** `yahoo-finance2` npm package
- **Macro data:** FRED API (free key) with `data/macro.json` manual fallback
- **Hosting:** Vercel free tier
- **Analytics:** Vercel Web Analytics (cookieless)

### Repo structure (target — clean from day 1, no `web/` subfolder)

```
buy-side-briefings/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # Dashboard
│   ├── briefings/
│   │   ├── page.tsx
│   │   └── [routine]/[slug]/page.tsx
│   ├── track-record/page.tsx
│   ├── watchlist/page.tsx
│   ├── about/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── api/
│       ├── quotes/route.ts
│       └── subscribe/route.ts
├── components/                   # React components (see prototype for full list)
├── lib/                          # data.ts, markets.ts, macro.ts, utils.ts
├── data/                         # Source of truth for site content
│   ├── briefings/
│   │   └── markets/<date>-<window>.mdx
│   ├── verdicts/
│   │   └── markets-<date>-<window>.json
│   └── macro.json
├── prompts/                      # Briefing prompt templates (source of truth)
│   ├── markets.md
│   ├── politics.md
│   ├── quote.md                  # optional — quote may stay Discord-only
│   ├── pre-earnings.md
│   ├── app-ideas.md              # optional
│   └── demand-signals.md         # optional
├── public/
├── next.config.ts                # NO outputFileTracingRoot / outputFileTracingIncludes
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                    # FRED_API_KEY (gitignored)
├── .env.example                  # FRED_API_KEY= (no value, committed)
├── .gitignore
├── README.md
└── CLAUDE.md                     # Project instructions for Claude sessions
```

**Critical structural decision:** put `data/` and `prompts/` *inside* the repo root alongside `app/`. This is what fixed the deployment 404 issue in the prototype — there is no need for `web/` to be a subfolder of anything else. The Vercel project should have Root Directory = `/` (default).

### Why this structure works
- Vercel deploys from the repo root with default settings — no Root Directory tweaks, no "include files outside" flags, no `outputFileTracingRoot` hackery
- `lib/data.ts` reads from `./data` via `path.resolve(process.cwd(), "data")`
- The briefing prompts live alongside the code so Claude can find them in any session pointed at the repo

---

## 8. Data model

### Verdict JSON schema (`data/verdicts/markets-YYYY-MM-DD-window.json`)

```jsonc
{
  "routine": "markets",                          // "markets" | "politics" | ...
  "date": "2026-05-15",
  "window": "morning",                           // "morning" | "afternoon" | "night" | null
  "generated_at": "2026-05-15T11:32:14Z",
  "is_seed": false,                              // true for example/demo data only

  "verdict": {
    "code": "hold",                              // "buy" | "hold" | "step_aside" | "bearish"
    "emoji": "🟡",
    "label": "HOLD / SELECTIVE DAY",
    "conviction": "medium",                      // "low" | "medium" | "high"
    "rationale_short": "Sentiment over-bullish into a thin breadth tape.",
    "supporting_data": [
      { "label": "AAII Bulls 52%", "url": "https://..." }
    ]
  },

  "snapshot": {
    "sp500":  { "level": 5824.5,  "change_pct":  0.31 },
    "nasdaq": { "level": 18920.0, "change_pct":  0.52 },
    "vix":    { "level": 14.2,    "change_pct": -3.1 },
    "ust10y": { "level": 4.18,    "change_bps":  2 },
    "dxy":    { "level": 104.6,   "change_pct": -0.1 }
  },

  "regime_risk": [
    { "name": "AAII Bull", "value": 52, "trigger_above": 55, "unit": "%" }
  ],

  "watchlist_mentions": [
    { "ticker": "NVDA", "note": "...", "sentiment": "positive" }
  ],
  "dont_buy": [
    { "ticker": "PLTR", "reason": "...", "better_entry": "$28-30" }
  ],
  "trade_setups": [
    {
      "asset": "SOXX",
      "direction": "short",
      "thesis": "...",
      "entry": "$245-247",
      "invalidation": "$252 close",
      "conviction": "medium",
      "horizon": "1-2 weeks"
    }
  ],
  "bear_case": "A smart bear says: ...",
  "body_mdx": "data/briefings/markets/2026-05-15-morning.mdx"
}
```

### Briefing MDX frontmatter

```markdown
---
date: 2026-05-15
window: morning
routine: markets
title: "Markets Briefing — Morning"
verdict_ref: markets-2026-05-15-morning
is_seed: false
---

(full readable markdown body here, sections with emoji headers, GFM tables, inline citations)
```

### Macro fallback JSON (`data/macro.json`)

Stores monthly-cadence values not available via Yahoo:
- AAII bull/bear (weekly), Fear & Greed, Shiller CAPE, ISM PMI, GDP print, Bitcoin halving dates, next FOMC date label
- FRED-sourced values (Fed funds, CPI, real yields, unemployment, 2s10s) override these at runtime when `FRED_API_KEY` is set

---

## 9. Data sources & costs

| Data | Source | Cost | Notes |
|---|---|---|---|
| Indices, ETFs, treasury yields, gold, oil, BTC, ETH | Yahoo Finance (`yahoo-finance2` npm) | Free, no key | 60s revalidation on ticker, 5min elsewhere |
| Fed funds, CPI, PCE, unemployment, 2s10s, 10Y real, balance sheet | FRED API | Free w/ key | `FRED_API_KEY` env var |
| FOMC implied probabilities | CME FedWatch | — | Deep-link out, no API |
| AAII, Fear & Greed, ISM, Shiller CAPE | Manual via `data/macro.json` | Free | Updated when briefings note new prints |
| Briefing generation | Claude Max (chat) | Already paid for | Zero marginal cost per briefing |
| Hosting | Vercel free tier | Free | Should comfortably stay within limits |

**Total expected monthly operating cost: $0** (assuming Claude Max already paid for separate reasons).

---

## 10. Compliance / legal

- Universal footer on every page: "Educational analysis only. Not investment advice. The author may hold positions in any name mentioned. Past performance does not guarantee future results."
- `/about` page repeats the disclaimer in long form
- `/privacy` (cookieless analytics, email collection scope)
- `/terms` (no warranty, no liability, user responsibility)
- **The Buy Verdict is editorial commentary, not personalized financial advice**. The site does not know any visitor's portfolio, risk tolerance, or holdings. This framing keeps us out of SEC adviser territory.
- No paid signals → no paywall → no membership-based recommendation regime → simpler legal posture for v1.

---

## 11. Migration plan from `discord-briefings/web/`

The prototype in `discord-briefings/web/` is functional locally but has a deployment bug related to `outputFileTracingRoot`. Rather than fixing in place, port the code to a fresh repo with a clean structure.

**Files to copy** (from `discord-briefings/web/`):
- `app/` (entire tree) — change nothing
- `components/` (entire tree) — change nothing
- `lib/utils.ts` — change nothing
- `lib/markets.ts` — change nothing
- `lib/macro.ts` — change `DATA_DIR` from `path.resolve(process.cwd(), "..", "data")` → `path.resolve(process.cwd(), "data")`
- `lib/data.ts` — same `DATA_DIR` change as above
- `package.json` — keep dependencies, drop "web@0.1.0" name in favor of new name
- `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` — change nothing
- `.gitignore` — change nothing (just don't have the `web/` prefix on entries)

**Files to copy** (from `discord-briefings/data/`):
- All briefings + verdicts + `macro.json` go into new repo's `data/`

**Files to copy** (from `discord-briefings/prompts/`):
- All briefing prompts go into new repo's `prompts/`

**Files NOT to copy**:
- `next.config.ts` — write fresh, with NO `outputFileTracingRoot` and NO `outputFileTracingIncludes`. Just empty config.
- `web/.env.local` — recreate manually in new repo (it's gitignored anyway; `FRED_API_KEY=c478a606377ff578a028f8b531b5d9c5`)
- The Python briefing scripts, GitHub Actions workflows, requirements.txt — these stay in `discord-briefings`

**`discord-briefings` repo cleanup** (optional, do later):
- Either keep `web/` and `data/` as a frozen prototype with a README note, or revert them. Doesn't matter — that repo will continue to be the Discord pipeline. The dashboard now lives elsewhere.

**Vercel project**:
- Delete the existing `market-dashboard-discord-briefings` Vercel project (or leave it but disconnect from GitHub).
- Create a new Vercel project against the new GitHub repo. Root Directory = `/` (default). Set `FRED_API_KEY` env var. Deploy.

---

## 12. Phased roadmap

### Phase 0 — Bootstrap (1 hour)
- Create new GitHub repo (e.g., `buy-side-briefings`)
- Run `npx create-next-app@latest .` with TS / Tailwind / App Router defaults
- Copy files per migration plan above
- Local `npm run dev` smoke test
- Connect Vercel; first deploy

### Phase 1 — Parity with prototype (½ day)
- All pages render
- Live FRED + Yahoo data confirmed in production
- Seed briefing visible with "Seed" badge
- Universal disclaimer footer verified

### Phase 2 — Track record polish (1 day)
- Recharts S&P line chart with verdict markers overlaid
- Auto-compute SPX +1d / +5d / +20d for each past verdict (yahoo-finance2 historical)
- "Was this call right?" footer on briefing detail pages

### Phase 3 — Subscribe + SEO (½ day)
- Subscribe form UI in `/about` footer
- Sitemap.xml, robots.txt
- Open Graph metadata per page
- Custom domain (if user has one)

### Phase 4 — First real briefing (you, ongoing)
- Generate a real markets briefing via Claude in the new repo
- Commit, verify it displays correctly, replaces seed banner

### Phase 5 — Public launch (cosmetic)
- Share URL with first audience (Twitter / Discord / wherever)
- Begin daily briefing cadence to populate track record

### Out of scope (post-v1)
- Email digest sending (Resend/ConvertKit) — only when subscriber count justifies it
- Paid tier
- Politics briefing standalone UI
- Multi-author / community
- Mobile app

---

## 13. Open questions

1. **Repo / domain name.** "Buy-Side Briefings" is the site brand from the prototype. Repo name could be `buy-side-briefings`, `bsb`, `marketdesk`, or something else. Custom domain optional but a `.com` or `.io` would help legitimacy.
2. **Author identity.** Public-facing as yourself, anonymous, or under a pseudonym? Affects the `/about` page copy.
3. **How often will briefings actually get generated?** If daily, the live look holds up. If twice a week, we need richer evergreen content so the dashboard doesn't feel stale.
4. **Politics briefings — port or skip for v1?** Currently the prototype groups them under `/briefings`. Could give them a standalone treatment later.
5. **First real briefing date.** Recommend: generate one for the date of soft-launch and commit before sharing the URL anywhere.

---

## 14. Definition of done (v1)

- [ ] New repo exists at github.com/jkleejr/<name>
- [ ] Site is live at a vercel.app URL (or custom domain)
- [ ] All 7 routes render: `/`, `/briefings`, `/briefings/[routine]/[slug]`, `/track-record`, `/watchlist`, `/about`, `/privacy`, `/terms`
- [ ] FRED-sourced macro panel shows "Live · FRED + Yahoo" badge
- [ ] Live ticker strip pulls real Yahoo quotes
- [ ] At least one real (non-seed) briefing is the latest verdict on the dashboard
- [ ] Universal disclaimer footer visible everywhere
- [ ] Lighthouse ≥90 on Performance / SEO / Accessibility on mobile
- [ ] `npm run build` passes locally with zero warnings
- [ ] `discord-briefings` repo is left untouched / clearly demarcated as the Discord pipeline, not the dashboard

---

## How to use this PRD

1. Save this file somewhere durable (e.g., the new repo's `/PRD.md` or `/docs/PRD.md`).
2. Open a new Claude Code session pointed at the new repo (empty or freshly `create-next-app`'d).
3. Paste this PRD into the first message with: *"Here is the PRD. Start with Phase 0 — bootstrap the project."*
4. Claude will scaffold from a clean slate using the migration plan in Section 11.
