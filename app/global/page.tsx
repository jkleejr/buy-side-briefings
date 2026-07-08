import Link from "next/link";
import BigAssetChart from "@/components/big-asset-chart";
import GlobalMarketsPanel from "@/components/global-markets-panel";
import Panel from "@/components/panel";

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
      </Panel>

      <BigAssetChart
        symbol="^N225"
        code="N225"
        title="Nikkei 225 — Japan"
        color="#ef4444"
        metaLabel="TOKYO · GLOBAL TECH + AUTOS"
      />

      <BigAssetChart
        symbol="^HSI"
        code="HSI"
        title="Hang Seng — Hong Kong (China gateway)"
        color="#f472b6"
        metaLabel="HONG KONG · CHINA TECH PROXY"
      />

      <BigAssetChart
        symbol="000001.SS"
        code="SSE"
        title="Shanghai Composite — China A-shares"
        color="#fb923c"
        metaLabel="SHANGHAI · MAINLAND CHINA"
      />

      <BigAssetChart
        symbol="^KS11"
        code="KOSPI"
        title="KOSPI — South Korea (Samsung & SK Hynix)"
        color="#84cc16"
        metaLabel="SEOUL · GLOBAL MEMORY-CHIP DUOPOLY"
      />

      <Panel code="EUROPE" title="Europe · the morning US gets">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          London/Frankfurt/Paris open ~3am US ET. By the time US opens at 9:30am,
          Europe is mid-session and has already digested overnight Asia plus
          European-specific news. Watch the DAX for German industrial / China-demand
          sensitivity; FTSE for energy and commodity exposure.
        </p>
      </Panel>

      <BigAssetChart
        symbol="^GDAXI"
        code="DAX"
        title="DAX — Germany's industrial heart"
        color="#fbbf24"
        metaLabel="FRANKFURT · INDUSTRIALS + AUTOS + CHEMICALS"
      />

      <BigAssetChart
        symbol="^FTSE"
        code="FTSE"
        title="FTSE 100 — UK (mostly a global play)"
        color="#22d3ee"
        metaLabel="LONDON · ENERGY + MINERS + GLOBAL CONSUMER"
      />

      <BigAssetChart
        symbol="^FCHI"
        code="CAC"
        title="CAC 40 — France (luxury proxy)"
        color="#a78bfa"
        metaLabel="PARIS · LUXURY + PHARMA + ENERGY"
      />

      <BigAssetChart
        symbol="^STOXX50E"
        code="STOXX"
        title="Euro Stoxx 50 — pan-Eurozone benchmark"
        color="#60a5fa"
        metaLabel="EUROZONE · BROAD BLUE-CHIP"
      />

      <Panel code="EM" title="Emerging markets · the growth lane">
        <p className="p-2 font-mono text-[11px] leading-snug text-[var(--dim)]">
          Nifty (India) is the biggest EM growth story — increasingly important as
          foreign capital diversifies away from China. Bovespa (Brazil) is the EM
          commodity play. Both decoupling from US has been notable in 2024–2026
          as the dollar weakened.
        </p>
      </Panel>

      <BigAssetChart
        symbol="^NSEI"
        code="NIFTY"
        title="Nifty 50 — India"
        color="#a78bfa"
        metaLabel="MUMBAI · IT SERVICES + BANKS"
      />

      <BigAssetChart
        symbol="^BVSP"
        code="BVSP"
        title="Bovespa — Brazil (EM commodity play)"
        color="#22c55e"
        metaLabel="SÃO PAULO · IRON ORE + OIL + BANKS"
      />

      <BigAssetChart
        symbol="^GSPTSE"
        code="TSX"
        title="S&P/TSX Composite — Canada"
        color="#ef4444"
        metaLabel="TORONTO · ENERGY + BANKS + MINERS"
      />

      <Panel code="EDU" title="How to use the global session">
        <div className="space-y-3 p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">
          <div>
            <div className="text-[var(--amber)]">The 24-hour clock for a US trader</div>
            <p className="mt-1">
              The trading day is global — by the time SPX opens at 9:30am ET, ~12
              hours of price discovery has already happened in other markets.
              For a US-only investor, foreign markets aren&apos;t a portfolio
              decision; they&apos;re an <span className="text-[var(--amber)]">information
              feed about what&apos;s coming</span> at your open.
            </p>
            <p className="mt-1 text-[var(--dim)]">
              Rough US-ET timeline (subject to DST): Tokyo 7pm prev–2am · Hong Kong
              9:30pm prev–4am · Frankfurt/Paris 3am–11:30am · London 3am–11:30am ·
              NY 9:30am–4pm.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Idiosyncratic vs systemic moves</div>
            <p className="mt-1">
              When all of Asia + Europe move together in one direction, it&apos;s a
              <span className="text-[var(--amber)]"> systemic</span> day — US will
              likely follow. When one region breaks from the others (Nikkei down
              hard but Europe shrugging it off), it&apos;s usually{" "}
              <span className="text-[var(--amber)]">idiosyncratic</span> — a
              Japan-specific story (yen, BoJ) that the US can mostly ignore.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">Specific names that matter for US tech</div>
            <p className="mt-1">
              <span className="text-[var(--amber-dim)]">Samsung + SK Hynix</span>{" "}
              (in KOSPI) — global memory chips. If they sell off overnight, NVDA/AMD
              usually open red. <span className="text-[var(--amber-dim)]">TSMC</span>{" "}
              (in Taiwan / TWSE) — same for foundry capacity, AI accelerator
              cost. <span className="text-[var(--amber-dim)]">LVMH/Hermès</span>{" "}
              (in CAC 40) — global luxury and Chinese consumer health.{" "}
              <span className="text-[var(--amber-dim)]">SAP</span> (in DAX) —
              European enterprise software, AI cloud read.
            </p>
          </div>

          <div>
            <div className="text-[var(--amber)]">When to actually act on it</div>
            <p className="mt-1">
              A single overnight session rarely matters unless something specific
              happened (BoJ rate decision, China PMI miss, European banking news).
              For day-to-day positioning, the global tape is *background*, not
              foreground. For weekly/monthly framing — divergences like
              &quot;Asia outperforming for 6 weeks running&quot; — it becomes
              real signal.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
