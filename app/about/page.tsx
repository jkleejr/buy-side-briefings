import Panel from "@/components/panel";

export const metadata = {
  title: "About — Buy-Side Briefings",
  description:
    "Buy-Side Briefings is a personal website with automated daily reports on the stock market — a trustworthy source of information that keeps readers updated.",
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
      <Panel code="SITE" title="What this site is">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            <span className="text-[var(--amber)]">Buy-Side Briefings</span> is a personal
            website with automated daily reports on the stock market. The goal is to
            create a trustworthy source of information that keeps readers updated.
          </p>
        </div>
      </Panel>

      {/* ----- Section 2: Why it exists ----- */}
      <Panel code="WHY" title="Why build this?">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            The stock market is fast paced and narratives can change quickly based on the
            news. Traders and investors should be informed on the latest events and
            current state of the stock market.
          </p>
        </div>
      </Panel>

      {/* ----- Disclaimer -----
          Kept from the previous version of this page. The rest of the About
          copy was replaced, but a site that publishes market reports should not
          quietly drop the line that says it isn't advice. */}
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
