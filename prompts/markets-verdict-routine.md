# Markets Verdict — canonical routine spec

Two cloud routines (claude.ai/code/routines) generate the twice-daily markets
read rendered on the home page and the briefings archive. The JSON these write
is the site's content backbone — the home page hero, the headlines, the market
snapshot, the regime levels and (on days with no MDX) the entire briefing body
all come from it, so these files must keep being written.

**No verdict, and no buy/sell/hold call anywhere.** The buy / hold / step_aside
/ bearish code is retired, and as of 2026-07-30 so is the softer version of it:
the site does not tell readers what to do with their money. Write
`verdict.headline` (what happened, plain English) and `rationale_short` (the
read — what it means and what would change it). Describe the tape; do not
instruct the reader. If a sentence could be rewritten as "so buy X" or "so sell
X", rewrite it as what the evidence shows instead — see
`prompts/markets-website.md` Step 3. **The routine
prompts live in the cloud account, not in this repo** — this file is the
in-repo source of truth. To change what a routine does, edit the cloud prompt
to match this file.

- **Markets Verdict — Morning** (`trig_01Uvs8J4Hnm2gLZE3NZXHZrr`, cron `35 11 * * *`,
  fires 7:35am ET so the file is up by ~8am; see the jitter note below): premarket read — S&P futures, Nasdaq, VIX, 10Y, DXY, the 3-5 stories
  moving markets, today's calendar. Writes `data/verdicts/markets-<TODAY>-morning.json`.
- **Markets Verdict — Night** (`trig_012oQHNd9A91W2UC6dgBKwt8`, cron `0 0 * * *`,
  8pm ET): post-close read — closing levels, after-hours moves, what drove the
  session, setup into tomorrow. Writes `data/verdicts/markets-<TODAY>-night.json`.

The two report routines that write the MDX run on the same clock, weekdays
only: **Morning markets report** (`trig_01DC21E5s31c9nWwJPnJsWgb`, cron
`40 11 * * 1-5`, fires 7:40am ET, publishes ~8am) and **Night markets report**
(`trig_01JZb1FRWVGhNtBRAgR7mZ1n`, cron `0 0 * * 2-6`, 8pm ET — Tue-Sat in UTC
is Mon-Fri evening in New York).

**The scheduler fires late — plan for it.** Over August the morning run
started 5–27 minutes after its cron (2026-09-01: cron 12:05Z, fired 12:32Z),
and a run then takes 7–15 minutes. The morning crons are therefore set
~25 minutes before the 8am ET publish target: verdict `35 11`, report
`40 11`. Worst case observed lands ~8:25am; typical ~8:00. The homepage label
"Morning report, 8 AM ET" is the publish target, not the fire time.

**Crons are UTC, so they drift an hour when DST ends** (2026-11-01). To hold
the same ET times through the winter, the morning pair becomes `35 12` /
`40 12` and night `0 1 * * *`; reverse all three when DST resumes.

Both: schema-by-example (read a recent same-window verdict file and match its
keys exactly; verdict.headline = plain-English news-first home title, ~90 chars, no prices/percentages/jargon), JSON.parse-validate before committing, commit + push to `deploy`
(push is mandatory — Vercel deploys from it; rebase-and-retry on rejection).
Never fabricate prices or URLs; say so plainly when sourcing is thin.

**No VIX gate (2026-07-25).** VIX stays in `snapshot` as a data point, but it
is NOT a regime indicator: never include a VIX row in `regime_risk`, never
cite a VIX threshold as a formal trigger in the briefing prose, and do not
carry the old "VIX above 17" breach forward from pre-July-25 briefings — the
regime framework runs on the remaining indicators, and breach counts are
denominated accordingly (what was "5 of 7" with a VIX breach becomes "4 of 6").

**History (2026-07-07):** these routines previously also generated per-asset
dossiers under `data/asset-daily/` for the single-name desk pages. Those pages
were removed and the dossier steps were stripped from both cloud prompts — the
routines must NOT write to `data/asset-daily/` anymore. The historical dossier
data stays in the repo (track record + archive).
