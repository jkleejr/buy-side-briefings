import PaperDesk from "@/components/paper-desk";

export const metadata = {
  title: "Paper Desk — Buy-Side Briefings",
  description:
    "Trade with fake money: buy and sell any ticker at live prices, place market and limit orders, and track your portfolio's equity curve over time. Stored in your browser.",
};

export default function DeskPage() {
  return (
    <div className="space-y-2">
      <header className="space-y-1 px-1 pb-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Paper Desk
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Fake money · live prices · this browser only
        </p>
      </header>
      <PaperDesk />
    </div>
  );
}
