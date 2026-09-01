import Panel from "@/components/panel";

export const metadata = {
  title: "About",
  description:
    "Buy Side uses Claude Opus 5 to generate daily reports on the stock market — a trustworthy source of information that keeps readers updated.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-5xl space-y-1 px-4 pb-14 pt-[39px] sm:px-6">
      <header className="space-y-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          About
        </h1>
      </header>

      <Panel title="What this site is">
        <div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <p>
            <span className="text-[var(--amber)]">Buy Side</span> uses Claude
            Opus 5 to generate daily reports on the stock market. The goal is to
            create a trustworthy source of information and keep readers updated.
          </p>
          <p>
            The stock market is fast paced and narratives can change quickly based on the
            news. Traders and investors should be informed on the latest events and
            current state of the stock market.
          </p>
        </div>
      </Panel>
    </article>
  );
}
