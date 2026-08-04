import Link from "next/link";
import LevelsChart from "@/components/levels-chart";
import MacroSections from "@/components/macro-sections";
import Panel from "@/components/panel";

// The rates instruments, in the order the story runs: short end of the curve
// the Fed steers, the long end the market sets, the bond price that inverts
// them, and the dollar that prices all of it against everyone else.
const MACRO_SYMBOLS = ["^TNX", "^TYX", "TLT", "DX-Y.NYB"];
const MACRO_LABELS: Record<string, string> = {
  "^TNX": "10Y Yield",
  "^TYX": "30Y Yield",
  TLT: "TLT",
  "DX-Y.NYB": "Dollar",
};

export const metadata = { title: "Macro — Buy-Side Briefings" };
export const revalidate = 60;

export default function MacroPage() {
  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
        >
          ◂ DASHBOARD
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Fed &amp; Macro
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Rates &amp; policy · inflation &amp; purchasing power · growth · jobs
        </p>
      </header>

      {/* The four macro pillars, each a tile grid fed live from FRED with
          data/macro.json as the manual fallback. The homepage keeps the
          compact FedPanel snapshot; this page is the full read. */}
      <MacroSections />

      {/* Same chart as the homepage: candles, derived levels, drawing tools.
          All four carry real OHLC from Yahoo. Only TLT reports traded volume —
          yields and the dollar index are calculated, so every bar reads zero
          and the chart disables its own Vol button for them. */}
      <Panel code="RATES" title="Rates, bonds & the dollar">
        <div className="p-2">
          <LevelsChart symbols={MACRO_SYMBOLS} labels={MACRO_LABELS} />
        </div>
      </Panel>

    </div>
  );
}
