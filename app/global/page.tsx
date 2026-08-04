import Link from "next/link";
import GlobalMarketsPanel from "@/components/global-markets-panel";
import LevelsChart from "@/components/levels-chart";
import Panel from "@/components/panel";

// One chart per region rather than one per index — the page's argument is that
// the session moves west, so the indices belong grouped by when they trade.
// Every one of these carries real OHLC and real volume from Yahoo.
const ASIA = ["^N225", "^HSI", "000001.SS", "^KS11"];
const EUROPE = ["^GDAXI", "^FTSE", "^FCHI", "^STOXX50E"];
const EM = ["^NSEI", "^BVSP", "^GSPTSE"];
const LABELS: Record<string, string> = {
  "^N225": "Nikkei",
  "^HSI": "Hang Seng",
  "000001.SS": "Shanghai",
  "^KS11": "KOSPI",
  "^GDAXI": "DAX",
  "^FTSE": "FTSE 100",
  "^FCHI": "CAC 40",
  "^STOXX50E": "Stoxx 50",
  "^NSEI": "Nifty 50",
  "^BVSP": "Bovespa",
  "^GSPTSE": "TSX",
};

export const metadata = { title: "Global Markets — Buy-Side Briefings" };
export const revalidate = 60;

export default function GlobalPage() {
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
          Global Markets
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          The overnight session · Asia opens first · Europe second · US last
        </p>
      </header>

      {/* Today's snapshot — same component as the dashboard. */}
      <GlobalMarketsPanel />

      <Panel code="ASIA" title="Asia · trades while the US sleeps">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Tokyo opens ~7pm US ET; Hong Kong + Shanghai ~9:30pm ET; Korea ~8pm ET.
          By the time you wake up, ~6 hours of Asian price discovery has happened.
          Big down in Asia → US futures usually open red. Big up → US futures
          green.
        </p>
        <div className="border-t border-[var(--border)] p-2">
          <LevelsChart symbols={ASIA} labels={LABELS} />
        </div>
      </Panel>

      <Panel code="EUROPE" title="Europe · the morning US gets">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          London/Frankfurt/Paris open ~3am US ET. By the time US opens at 9:30am,
          Europe is mid-session and has already digested overnight Asia plus
          European-specific news. Watch the DAX for German industrial / China-demand
          sensitivity; FTSE for energy and commodity exposure.
        </p>
        <div className="border-t border-[var(--border)] p-2">
          <LevelsChart symbols={EUROPE} labels={LABELS} />
        </div>
      </Panel>

      <Panel code="EM" title="Emerging markets · the growth lane">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Nifty (India) is the biggest EM growth story — increasingly important as
          foreign capital diversifies away from China. Bovespa (Brazil) is the EM
          commodity play. Both decoupling from US has been notable in 2024–2026
          as the dollar weakened.
        </p>
        <div className="border-t border-[var(--border)] p-2">
          <LevelsChart symbols={EM} labels={LABELS} />
        </div>
      </Panel>

    </div>
  );
}
