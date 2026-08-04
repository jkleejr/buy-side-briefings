import Panel from "@/components/panel";

export const metadata = {
  title: "About — Buy-Side Briefings",
  description:
    "What Buy-Side Briefings is: a market briefing published twice a day, with the data behind it cited and linked. It reports; the investment decision stays with the reader.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-2">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          About
        </h1>
      </header>

      {/* ----- Section 1: What the site is ----- */}
      <Panel code="WHAT" title="What this site is">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            <span className="text-[var(--amber)]">Buy-Side Briefings</span> publishes a
            market briefing twice a day — a morning edition before the open and a night
            edition after the close — for people who manage their own money.
          </p>
          <p>
            Each briefing covers what happened, what it means, and what would change it.
            Every claim carries a number, and every number carries a link to where it came
            from. Around the briefings sit the pages you would check next: a calendar of
            what is coming, a watchlist, and sector, macro and global market data.
          </p>
          <p>
            <span className="text-[var(--amber)]">The site does not tell you what to buy
            or sell.</span> That decision is yours, and it depends on things this site
            does not know. The job here is to put the relevant information in front of you
            so you can make it well — not to make it for you.
          </p>
        </div>
      </Panel>

      {/* ----- Section 2: What a briefing carries ----- */}
      <Panel code="BRIEF" title="What a briefing carries">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p className="text-[var(--amber-dim)]">
            Each one is written in three tiers, so you can stop at the depth you need:
          </p>
          <ul className="ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
            <li>
              <span className="text-[var(--amber)]">30 seconds</span> — the headline in
              plain English, and the few points that carried the session.
            </li>
            <li>
              {/* Explicit {" "}: JSX drops the leading space of a text child
                  that also contains an entity, so "…evidence</span> — the
                  day&apos;s…" rendered as "evidence— the day's". */}
              <span className="text-[var(--amber)]">The evidence</span>{" "}
              — the day&apos;s data points, each linked back to its source.
            </li>
            <li>
              <span className="text-[var(--amber)]">The full read</span> — the long-form
              note, with the levels that would change the picture stated explicitly.
            </li>
          </ul>
          <p>
            A market snapshot is captured at the moment of writing — index and rate levels
            as they stood — so a briefing stays anchored to the tape it was written
            against rather than quietly reading differently a week later.
          </p>
        </div>
      </Panel>

      {/* ----- Section 3: Where the numbers come from ----- */}
      <Panel code="DATA" title="Where the numbers come from">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <ul className="ml-3 list-disc space-y-1 pl-2 marker:text-[var(--amber-dim)]">
            <li>
              <span className="text-[var(--amber)]">Yahoo Finance</span> — quotes, charts,
              sector ETFs, global indices and earnings dates.
            </li>
            <li>
              <span className="text-[var(--amber)]">FRED</span> (Federal Reserve Economic
              Data) — policy rates, inflation, employment and Treasury yields.
            </li>
            <li>
              <span className="text-[var(--amber)]">Reporting and filings</span>{" "}
              — cited inline in the briefings, and read from SEC filings where a
              fund&apos;s holdings are involved.
            </li>
          </ul>
          <p>
            Briefings are produced by a scheduled routine that researches the session and
            commits the result into the repository as plain files; the site rebuilds from
            them. There is no database, and no publishing step beyond the commit — which
            is also why the archive can be read all the way back.
          </p>
        </div>
      </Panel>

      {/* ----- Section 4: What this is not ----- */}
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
            Not a guarantee of anything. A read can be wrong, and some of them will be.
          </li>
        </ul>
      </Panel>

      {/* ----- Disclaimer ----- */}
      <Panel code="DSCLM" title="Disclaimer">
        <p className="p-3 font-mono text-[12px] leading-relaxed text-[var(--amber)]">
          The content on this site is for educational and informational purposes only. It
          does not constitute investment advice, an offer to buy or sell any security, or a
          solicitation of any kind. The author may hold positions in any name mentioned. Do
          your own research, consult a licensed professional, and never invest more than
          you can afford to lose.
        </p>
      </Panel>
    </article>
  );
}
