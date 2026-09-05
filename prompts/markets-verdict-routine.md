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
instruct the reader. If a sentence could be rewritten as "so buy X" or "so
sell X", rewrite it as what the evidence shows instead — see
`prompts/markets-website.md` Step 3.

**`verdict.lede_short` is required (2026-09-03).** Two to three sentences that
stand alone as the whole read — this is what a phone shows under the headline in
place of `rationale_short`, so for most readers it is the only prose from the
report they see. Write it last, from the finished report, and make it carry the
insight rather than the opening. Under ~500 characters. Omitting it is not fatal
— the site falls back to slicing the front off `rationale_short` — but the
fallback is the start of the read, not a summary of it. Both cloud verdict
prompts were updated to match on 2026-09-04; the two *report* routines pick it
up from `prompts/markets-website.md`, which their own prompts tell them to read
and treat as overriding.

**Scenario probabilities are retired (2026-09-04).** "Base 60% / bull 25% /
bear 15%" is a directional call wearing a percentage — the same thing the
buy/hold/step-aside code was, at one remove. Reports state what would have to
happen instead: the level, what breaking it would mean, what could break it.
Probabilities the *market* charges for — CME FedWatch odds, options-implied
moves — are data and stay. Rule lives in `prompts/markets-website.md`.

**`verdict.code` is retired (2026-09-04) — do not write it.** The
buy/hold/step_aside/bearish field outlived the call itself by six weeks: the
routines kept emitting it and `MarketsVerdict` kept requiring it, while the only
consumer was a `sentimentFor()` helper whose output no component ever rendered.
The field is now optional on the type, the dead view plumbing is gone, and both
cloud prompts have been told to omit it. Files on disk keep theirs and still
parse.

**The routine prompts live in the cloud account, not in this repo** — this file is the
in-repo source of truth. To change what a routine does, edit the cloud prompt
to match this file.

**Sources (2026-09-04):** all four prompts now say to search the Wall Street
Journal and Bloomberg every run for the read, and to cite the primary source
underneath the story — the agency, the company release or filing, the exchange,
or a free wire — because a paywalled link is a dead click for most readers. WSJ
and Bloomberg are cited directly only for their own original reporting, flagged
`(subscription)`. Working around a paywall is forbidden, as is citing a story
the run could not actually read. Full rule: "Where to read vs. what to cite" in
`prompts/markets-website.md`.

**Ownership: the report routine is the primary, the verdict routine is the
backstop (changed 2026-09-04).** Both write the same
`data/verdicts/markets-<date>-<window>.json`, from their own independent
research — the report has never read the verdict. Until 2026-09-04 they simply
raced, and the loser's work was thrown away or, worse, merged: `695713a`
replaced `d629dda` wholesale on 09-03 (different headline, different
supporting_data), and on 09-02 the collision produced `6507cf2`, a merge commit
where a run had to arbitrate between two versions of the same file.

The rule now is one owner per window:

- **Reports run first and own the file.** Morning 8:00am, night 8:00pm,
  weekdays. They write it exactly as before; nothing in their prompts changed.
- **Verdicts run 45 minutes later and defer.** Both prompts open with a
  BACKSTOP block: after the pull, `test -f` the target path — if it exists the
  report already published, so stop immediately, do no research, commit nothing.
  A second check with `git ls-tree origin/deploy` runs immediately before
  `git add`, in case the report published while the verdict was working. On a
  conflict the verdict abandons its own version.
- Both were renamed with a `(backstop)` suffix on 2026-09-04 so the
  routine list itself says which one runs the show.
- So the verdict routines really write on **weekends, US market holidays, and
  any weekday the report run failed** — that last case is why they still fire
  daily rather than on a weekend-only cron.

The visible payoff: the home page headline and the report a reader clicks into
always come from the same run, and a weekday morning deploys once instead of
twice.

- **Markets Verdict — Morning (backstop)** (`trig_01Uvs8J4Hnm2gLZE3NZXHZrr`, cron
  `45 12 * * *`, 8:45am ET daily — moved 7:50 → 7:55 → 8:30 → 8:45 on 2026-09-04):
  premarket read — S&P futures, Nasdaq, VIX, 10Y, DXY, the 3-5 stories moving
  markets, today's calendar. Writes `data/verdicts/markets-<TODAY>-morning.json`.
- **Markets Verdict — Night (backstop)** (`trig_012oQHNd9A91W2UC6dgBKwt8`, cron
  `45 0 * * *`, 8:45pm ET daily — moved from 8:00pm on 2026-09-04): post-close
  read — closing levels, after-hours moves, what drove the session, setup into
  tomorrow. Writes `data/verdicts/markets-<TODAY>-night.json`.
- **Morning markets report** (`trig_01DC21E5s31c9nWwJPnJsWgb`, cron
  `0 12 * * 1-5`, 8:00am ET weekdays — moved from 7:55 on 2026-09-04).
- **Night markets report** (`trig_01JZb1FRWVGhNtBRAgR7mZ1n`, cron
  `0 0 * * 2-6`, 8:00pm ET — Tue-Sat in UTC is Mon-Fri evening in New York).

**Timing target: finished between 8:00 and 8:45 ET, both windows.** Measured
over the ten most recent runs of each (2026-08-21 → 09-03):

| | fire lag after cron | run length |
|---|---|---|
| Verdict | 0.3–3.6 min | 5.4–11.4 min |
| Report | 0.2–7.2 min | 2.5–21.6 min |

The report's cron is set so its fastest possible run still lands after 8:00
(8:00 + 2.7 min = 8:03); its slowest in the sample finishes 8:29.

**Verified live 2026-09-04, and the gap went 30 → 45 minutes as a result.**
Both backstops exited clean on the first real test — the morning ran 29
seconds, the night 31, against 5–11 minutes for a run that does the work, with
`test -f` → FILE EXISTS → "Per rule (a), stopping immediately" in the log and
no WebSearch and no commit. Rule (a) works.

But the margin was two minutes, not the nine projected. The scheduler fired the
report 19.6 minutes late that morning — outside the 0.2–7.2 min band this was
sized against — so it finished 12:30:10Z and the backstop started 12:32:28Z.
Had the report been three minutes slower the untested rule (b) path would have
had to catch it. At 45 minutes, a 19-minute scheduler delay plus the slowest
run on record (21.6 min) still lands before the backstop fires.

The cost falls on weekends, when the backstop is the only publisher: the read
now lands ~8:50–8:56 ET rather than ~8:35, outside the 8:45 target above. That
target describes weekdays, which is where it matters.

One outlier sits outside those lag bands: 2026-09-01, cron 12:05Z fired 12:32Z,
a 27-minute scheduler delay. It is the only one in twenty runs. Under the old
design it would have caused a collision; under the new one the verdict simply
finds the file missing at 8:30, publishes, and the late report overwrites it —
still one story on the page at any moment.

The homepage and the report page print the actual finish time from
`generated_at`, stamped by `scripts/stamp-verdict.mjs`; the variation is
meant to be visible, not hidden behind a fixed label.

**Crons are UTC, so they drift an hour when DST ends** (2026-11-01). To hold
the same ET times through the winter all four move an hour later in UTC:
morning report `0 13 * * 1-5`, morning verdict `45 13 * * *`, night report
`0 1 * * 2-6`, night verdict `45 1 * * *`. Reverse all four when DST resumes.

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
