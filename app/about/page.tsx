import Link from "next/link";
import Panel from "@/components/panel";

export const metadata = { title: "About — Buy-Side Briefings" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-2">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          About
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          What this site is, how it works, and how the verdict is graded.
        </p>
      </header>

      {/* ----- Section 1: What the site does ----- */}
      <Panel code="WHAT" title="What this site does">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            <span className="text-[var(--amber)]">Buy-Side Briefings</span> is a daily morning
            read for self-directed investors. One page, terminal-dense, organized like a
            professional trader&apos;s screen: live market data above the fold, opinionated
            editorial commentary alongside, public track record below.
          </p>
          <p>
            The whole site is built around <span className="text-[var(--amber)]">one
            question per session</span>: <em>given everything happening right now, what
            should I do?</em> The answer is a single time-stamped verdict (BUY, HOLD, STEP
            ASIDE, or BEARISH) with conviction, cited data, and a mandatory bear case.
          </p>
          <p>
            Three layers of context surround that verdict:
          </p>
          <ul className="ml-3 list-disc space-y-1 pl-2 text-[var(--foreground)] marker:text-[var(--amber-dim)]">
            <li>
              <span className="text-[var(--amber-dim)]">Short term · days to 2 weeks</span> —
              live ticker tape, market snapshot, regime risk indicators, crypto,
              SPY/Gold/Silver charts.
            </li>
            <li>
              <span className="text-[var(--amber-dim)]">Mid term · 1–3 months</span> —
              positioning &amp; valuation, sector rotation, US market breadth, global
              indices.
            </li>
            <li>
              <span className="text-[var(--amber-dim)]">Long term · 6 months+</span> — Fed
              policy &amp; macro, real-economy data, BTC halving cycle clock.
            </li>
          </ul>
          <p>
            Everything has a hover-to-learn explanation — toggle{" "}
            <span className="text-[var(--amber)]">Learn ON</span> in the top right, then
            hover any underlined term (ticker, indicator, panel title) for a plain-English
            explainer.
          </p>
        </div>
      </Panel>

      {/* ----- Section 2: How it works (the pipeline) ----- */}
      <Panel code="HOW" title="How it works">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            <span className="text-[var(--amber-dim)]">Data sources.</span> Live market data
            comes from two free APIs:
          </p>
          <ul className="ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
            <li>
              <span className="text-[var(--amber)]">Yahoo Finance</span> — quotes, charts,
              sector ETFs, global indices, crypto. No key required. Refresh cadence:
              60s–5min depending on the panel.
            </li>
            <li>
              <span className="text-[var(--amber)]">FRED</span> (Federal Reserve Economic
              Data) — Fed funds, CPI/Core PCE, unemployment, Treasury yields, balance
              sheet. Free with an API key. Refreshed hourly.
            </li>
          </ul>
          <p>
            <span className="text-[var(--amber-dim)]">Editorial pipeline.</span> Briefings
            are <em>not</em> algorithmic. Each one is written by hand in a chat session
            with an LLM (Claude), following a structured template that forces specificity
            and citation. The briefing produces two files committed to the repo:
          </p>
          <ul className="ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
            <li>
              <code className="border border-[var(--border)] bg-[var(--panel-head)] px-1 text-[var(--amber)]">
                data/briefings/&lt;routine&gt;/&lt;date&gt;-&lt;window&gt;.mdx
              </code>{" "}
              — the readable long-form briefing.
            </li>
            <li>
              <code className="border border-[var(--border)] bg-[var(--panel-head)] px-1 text-[var(--amber)]">
                data/verdicts/&lt;routine&gt;-&lt;date&gt;-&lt;window&gt;.json
              </code>{" "}
              — the structured verdict (code, conviction, supporting data, trade setups,
              bear case, market snapshot).
            </li>
          </ul>
          <p>
            <span className="text-[var(--amber-dim)]">Rendering.</span> The site is built
            on Next.js with React Server Components. Pages are mostly server-rendered HTML
            (fast, almost no JavaScript), with small client islands only where needed
            (charts, hover toggles, timeframe selectors). The dashboard re-fetches data
            on its own — your browser doesn&apos;t poll APIs directly.
          </p>
          <p>
            <span className="text-[var(--amber-dim)]">Persistence.</span> Briefings and
            verdicts live as plain files in the repo. They accumulate over time. The
            track-record chart and ledger automatically read all of them — there&apos;s no
            database, no separate &quot;publishing&quot; step beyond committing the file.
          </p>
        </div>
      </Panel>

      {/* ----- Section 3: How the verdict works ----- */}
      <Panel code="VRDCT" title="How the verdict works">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div className="space-y-2">
            <p>
              Every Markets briefing ends in <span className="text-[var(--amber)]">one
              verdict code</span>. The four possibilities, and what each means:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="border border-[var(--border)] bg-black p-2">
                <div className="font-mono text-[14px] text-[var(--up)]">🟢 BUY</div>
                <div className="mt-1 text-[11px] text-[var(--dim)]">
                  Actively bullish. Direction: expect SPX up over the briefing&apos;s
                  horizon. Includes named entry levels and invalidation.
                </div>
              </div>
              <div className="border border-[var(--border)] bg-black p-2">
                <div className="font-mono text-[14px] text-[var(--amber)]">🟡 HOLD</div>
                <div className="mt-1 text-[11px] text-[var(--dim)]">
                  No directional call. Either the setup is unclear or both bull and bear
                  cases balance out. Informational — not graded right or wrong.
                </div>
              </div>
              <div className="border border-[var(--border)] bg-black p-2">
                <div className="font-mono text-[14px] text-[#fb923c]">🟠 STEP ASIDE</div>
                <div className="mt-1 text-[11px] text-[var(--dim)]">
                  Cautious — not actively short, but explicitly not chasing. Graded right
                  if SPX is flat or down (you didn&apos;t miss meaningful upside).
                </div>
              </div>
              <div className="border border-[var(--border)] bg-black p-2">
                <div className="font-mono text-[14px] text-[var(--down)]">🔴 BEARISH</div>
                <div className="mt-1 text-[11px] text-[var(--dim)]">
                  Actively negative. Direction: expect SPX down. May include a specific
                  short, hedge, or pair trade.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--amber-dim)]">What each verdict comes with:</p>
            <ul className="ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--amber)]">Conviction</span> — low / medium /
                high. Not every call is high-conviction; honest hedging is part of the
                discipline.
              </li>
              <li>
                <span className="text-[var(--amber)]">Rationale</span> — one or two
                sentences capturing the core thesis.
              </li>
              <li>
                <span className="text-[var(--amber)]">Supporting data</span> — 4–6 cited
                data points, each linked back to its source.
              </li>
              <li>
                <span className="text-[var(--amber)]">Mandatory bear case</span> — the
                strongest argument <em>against</em> the call. Written into the briefing
                schema so it can&apos;t be skipped.
              </li>
              <li>
                <span className="text-[var(--amber)]">Trade setups</span> (optional) — named
                asset, direction, entry, invalidation, conviction, time horizon.
              </li>
              <li>
                <span className="text-[var(--amber)]">&ldquo;Don&apos;t buy&rdquo; list</span>{" "}
                (optional) — names actively avoided right now, with better entry points
                noted.
              </li>
              <li>
                <span className="text-[var(--amber)]">Market snapshot</span> — index/rate
                levels captured at the moment the briefing was written, so the call is
                anchored to a specific tape.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--amber-dim)]">How a verdict gets graded:</p>
            <p>
              The <Link href="/track-record" className="text-[var(--cyan-term)] hover:underline">Track
              Record</Link> page automatically scores every verdict against SPX returns at
              three windows: <span className="text-[var(--amber)]">+1 trading day</span>,{" "}
              <span className="text-[var(--amber)]">+5 trading days</span>, and{" "}
              <span className="text-[var(--amber)]">+20 trading days</span>. The scoring
              rules:
            </p>
            <ul className="ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
              <li>
                <span className="text-[var(--up)]">BUY</span> — right if SPX is up over the
                window.
              </li>
              <li>
                <span className="text-[var(--down)]">BEARISH</span> — right if SPX is down.
              </li>
              <li>
                <span className="text-[#fb923c]">STEP ASIDE</span> — right if SPX is flat or
                down (i.e., you didn&apos;t miss meaningful upside).
              </li>
              <li>
                <span className="text-[var(--amber)]">HOLD</span> — informational, not
                graded.
              </li>
            </ul>
            <p>
              Windows show <span className="text-[var(--dim)]">pending</span> until enough
              trading days have elapsed. The aggregate hit rate becomes meaningful around
              ~20 verdicts — below that, treat it as anecdote, not signal.
            </p>
          </div>
        </div>
      </Panel>

      {/* ----- Section 4: The voice ----- */}
      <Panel code="VOICE" title="The voice">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            Most retail-facing market commentary reads like{" "}
            <span className="text-[var(--amber-dim)]">sell-side cheerleading</span>: every
            dip is a buying opportunity, every rally is just getting started, and the only
            verdict is &ldquo;hold.&rdquo; This site is built on the opposite premise — that
            telling you when <em>not</em> to buy is as important as telling you when to buy.
          </p>
          <p>
            Every briefing is required to include at least one short, hedge, or pair idea,
            plus the strongest argument <em>against</em> our own positioning.{" "}
            <span className="text-[var(--amber)]">Conviction in both directions, or no
            conviction at all.</span>
          </p>
        </div>
      </Panel>

      {/* ----- Section 5: What this is not ----- */}
      <Panel code="NOT" title="What this is not">
        <ul className="m-0 space-y-1 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <li>
            <span className="text-[var(--amber-dim)]">— </span>
            Not personalized advice. The site doesn&apos;t know your portfolio, risk
            tolerance, or tax situation.
          </li>
          <li>
            <span className="text-[var(--amber-dim)]">— </span>
            Not a recommendation to buy or sell any specific security.
          </li>
          <li>
            <span className="text-[var(--amber-dim)]">— </span>
            Not a substitute for talking to a licensed financial advisor.
          </li>
          <li>
            <span className="text-[var(--amber-dim)]">— </span>
            Not a guarantee of future results. Past calls can be wrong; future calls will
            be wrong.
          </li>
        </ul>
      </Panel>

      {/* ----- Disclaimer ----- */}
      <Panel code="DSCLM" title="Disclaimer">
        <p className="p-3 font-mono text-[12px] leading-relaxed text-[var(--amber)]">
          The content on this site is for educational and entertainment purposes only. It
          does not constitute investment advice, an offer to buy or sell any security, or a
          solicitation of any kind. The author may hold positions in any name mentioned. Do
          your own research, consult a licensed professional, and never invest more than
          you can afford to lose.
        </p>
      </Panel>
    </article>
  );
}
