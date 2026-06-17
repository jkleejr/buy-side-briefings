import AiPortfolioView from "@/components/ai-portfolio-view";
import { getAiPortfolio } from "@/lib/ai-portfolio";
import { getTradeQuotes, type TradeQuote } from "@/lib/markets";

export const revalidate = 300; // ISR: re-mark to live prices every 5 min.

export const metadata = {
  title: "AI Portfolio — Buy-Side Briefings",
  description:
    "The AI Conviction Book: a $1,000,000 paper portfolio the model runs itself, deciding what to buy, hold, and sell from the same daily analysis that drives the dossiers — marked to live prices with a full track record.",
};

export default async function AiPortfolioPage() {
  const portfolio = getAiPortfolio();

  if (!portfolio) {
    return (
      <div className="space-y-2">
        <header className="space-y-1 px-1 pb-1">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            AI Portfolio
          </h1>
        </header>
        <div className="border border-[var(--border)] bg-[var(--panel)] p-4 text-center font-mono text-[11px] text-[var(--dim)]">
          The AI portfolio hasn&apos;t been seeded yet.
        </div>
      </div>
    );
  }

  const symbols = portfolio.positions.map((p) => p.symbol);
  const quoteList = await getTradeQuotes(symbols);
  const quotes: Record<string, TradeQuote> = {};
  for (const q of quoteList) quotes[q.symbol] = q;
  const asOf = new Date().toISOString();

  return (
    <div className="space-y-2">
      <header className="space-y-1 px-1 pb-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          AI Portfolio
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          {portfolio.name} · $1M paper stake · the AI decides · live prices
        </p>
      </header>
      <AiPortfolioView portfolio={portfolio} quotes={quotes} asOf={asOf} />
    </div>
  );
}
