# AI Conviction Book — daily update protocol

`portfolio.json` is the single source of truth for the `/ai-portfolio` page. The
AI started with **$1,000,000** on the inception date and runs the book itself.
Schema lives in `lib/ai-portfolio.ts`; the page (`app/ai-portfolio/page.tsx`)
marks positions to **live prices** at render — you do **not** store live prices
here, only cost basis and the daily equity mark.

## Each day (fold into the daily dossier routine)

1. **Re-read the day's analysis** — the new dossiers (nvda/btc/skhynix/spcx), the
   markets verdict, and the short/long-term ideas — exactly the same inputs that
   drive the rest of the site. Keep the book consistent with that narrative.
2. **Decide buy / hold / trim / sell.** Most days the right answer is HOLD and the
   book doesn't change — that's fine and realistic. Only trade when the analysis
   genuinely warrants it. Keep some cash as dry powder.
3. **If you trade**, mutate `positions` and `cash` correctly (long-only, no margin;
   fractional qty allowed for crypto). A buy lowers cash and adds/averages a
   position; a sell raises cash and books realized P&L into `realizedPnL`. Append
   one `decisions` entry per action (newest first) with `action`, `symbol`,
   `qty`, `price` (the live price you transacted at), `conviction`, `rationale`.
4. **Update each holding's `lean`** (buy/add/hold/trim/sell) and refresh `thesis`
   if the reasoning changed.
5. **Append one `equity` mark** for the date: `{ date, equity, cash, invested }`,
   where `invested` = Σ(qty × that day's price) and `equity` = cash + invested.
   Use the day's closing prices (the night run is best for this). One mark per
   calendar day — overwrite if the date already exists.
6. **Refresh `outlook`** (the current market read driving the book) and bump
   `updated` to the current ISO timestamp.
7. **Commit + push to `deploy`** so Vercel redeploys (same as the dossiers).

## Invariants

- `equity` is chronological (oldest → newest); the page overwrites today's mark
  with live equity, so intra-day accuracy of today's point isn't critical.
- `cash` must never go negative; total of position market values + cash is equity.
- Don't churn. A believable track record comes from conviction, not activity.
