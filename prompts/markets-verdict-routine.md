# Markets Verdict — canonical routine spec

Two cloud routines (claude.ai/code/routines) generate the twice-daily markets
verdict rendered on the home page and the briefings archive. **The routine
prompts live in the cloud account, not in this repo** — this file is the
in-repo source of truth. To change what a routine does, edit the cloud prompt
to match this file.

- **Markets Verdict — Morning** (`trig_01Uvs8J4Hnm2gLZE3NZXHZrr`, cron `0 11 * * *`,
  ~7am ET): premarket read — S&P futures, Nasdaq, VIX, 10Y, DXY, the 3-5 stories
  moving markets, today's calendar. Writes `data/verdicts/markets-<TODAY>-morning.json`.
- **Markets Verdict — Night** (`trig_012oQHNd9A91W2UC6dgBKwt8`, cron `0 1 * * *`,
  ~9pm ET): post-close read — closing levels, after-hours moves, what drove the
  session, setup into tomorrow. Writes `data/verdicts/markets-<TODAY>-night.json`.

Both: schema-by-example (read a recent same-window verdict file and match its
keys exactly), JSON.parse-validate before committing, commit + push to `deploy`
(push is mandatory — Vercel deploys from it; rebase-and-retry on rejection).
Never fabricate prices or URLs; lower conviction and say so when sourcing is thin.

**History (2026-07-07):** these routines previously also generated per-asset
dossiers under `data/asset-daily/` for the single-name desk pages. Those pages
were removed and the dossier steps were stripped from both cloud prompts — the
routines must NOT write to `data/asset-daily/` anymore. The historical dossier
data stays in the repo (track record + archive).
