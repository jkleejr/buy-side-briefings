
export const metadata = {
  title: "About",
  description:
    "Buy Side uses Claude Opus 5 to generate daily reports on the stock market.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-5xl space-y-1 px-4 pb-14 pt-[39px] sm:px-6">
      <header className="space-y-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          About
        </h1>
      </header>

      <section className="border border-[var(--border)] bg-[var(--panel)]">
        <div className="space-y-2 px-2 py-1 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
          <p>
            <span className="text-[var(--amber)]">Buy Side</span> uses Claude
            Opus 5 to generate daily reports on the stock market.
          </p>
        </div>
      </section>
    </article>
  );
}
