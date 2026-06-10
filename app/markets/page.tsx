import Link from "next/link";
import Panel from "@/components/panel";

export const metadata = {
  title: "Markets — Buy-Side Briefings",
  description:
    "Every market depth view in one place: US indices, tech, sectors, breadth, metals, global sessions, macro, crypto, and KOSPI.",
};

type HubLink = {
  href: string;
  code: string;
  title: string;
  desc: string;
};

const SECTIONS: { title: string; note: string; links: HubLink[] }[] = [
  {
    title: "US Equities",
    note: "indices, leaders, internals",
    links: [
      {
        href: "/indices",
        code: "INDX",
        title: "US Indices",
        desc: "SPX · Nasdaq · Dow · Russell — full charts, every timeframe",
      },
      {
        href: "/tech",
        code: "TECH",
        title: "Tech & Mega-caps",
        desc: "The names that drive the index — charts and relative strength",
      },
      {
        href: "/sectors",
        code: "SECT",
        title: "Sector Rotation",
        desc: "Which sectors lead, which lag — the rotation map",
      },
      {
        href: "/pulse",
        code: "PULSE",
        title: "US Pulse",
        desc: "Breadth, credit, copper, small caps — what SPX alone hides",
      },
    ],
  },
  {
    title: "Macro & Cross-Asset",
    note: "rates, dollar, commodities, world",
    links: [
      {
        href: "/macro",
        code: "MACRO",
        title: "Macro",
        desc: "Fed, inflation, labor, valuation — the regime dashboard",
      },
      {
        href: "/global",
        code: "GLBL",
        title: "Global Markets",
        desc: "FX, bonds, overnight sessions around the world",
      },
      {
        href: "/metals",
        code: "MTLS",
        title: "Metals",
        desc: "Gold and silver — the anti-dollar trade",
      },
    ],
  },
  {
    title: "Crypto & Asia",
    note: "risk sentiment & the Korea desk",
    links: [
      {
        href: "/crypto",
        code: "CRYPTO",
        title: "Crypto",
        desc: "Daily BTC/ETH briefings + live charts and cycle context",
      },
      {
        href: "/kospi",
        code: "KOSPI",
        title: "KOSPI",
        desc: "Korean market briefings — KOSPI/KOSDAQ, won, chips",
      },
    ],
  },
];

export default function MarketsHubPage() {
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
          Markets
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Every depth view · charts, internals, macro, world
        </p>
      </header>

      {SECTIONS.map((section) => (
        <Panel key={section.title} code="HUB" title={section.title} meta={<span>{section.note}</span>}>
          <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {section.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group border-[var(--border)] px-3 py-2.5 hover:bg-[rgba(255,165,0,0.04)] sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(4n)]:border-r-0"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
                  {l.code}
                </div>
                <div className="mt-0.5 font-mono text-[13px] font-semibold text-[var(--foreground)] group-hover:text-[var(--amber)]">
                  {l.title} <span className="text-[var(--cyan-term)]">▸</span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] leading-snug text-[var(--dim)]">
                  {l.desc}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
