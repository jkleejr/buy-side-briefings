import Panel from "@/components/panel";
import {
  type Portfolio,
  type Holding,
  type ThemeSlice,
  type PositionSide,
  fmtUsd,
} from "@/lib/situational-awareness";

const THEME_COLOR: Record<string, string> = {
  power: "var(--amber)",
  miners: "var(--cyan-term)",
  compute: "var(--up)",
  memory: "var(--amber-dim)",
  semis: "var(--dim)",
};

function SideTag({ sides }: { sides: PositionSide[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {sides.map((s) => (
        <span
          key={s}
          className={`px-1 text-[9px] uppercase tracking-widest ${
            s === "put"
              ? "text-[var(--down)]"
              : s === "call"
                ? "text-[var(--cyan-term)]"
                : "text-[var(--up)]"
          }`}
        >
          {s === "long" ? "STOCK" : s}
        </span>
      ))}
    </span>
  );
}

function HoldingsTable({
  rows,
  total,
}: {
  rows: Holding[];
  total: number;
}) {
  const max = rows.length ? rows[0].value : 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-[9px] uppercase tracking-widest text-[var(--dim)]">
            <th className="px-2 py-1 text-left">Ticker</th>
            <th className="px-2 py-1 text-left">Name</th>
            <th className="px-2 py-1 text-left">Held as</th>
            <th className="px-2 py-1 text-right">Value</th>
            <th className="px-2 py-1 text-right">% Book</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => {
            const weight = total ? (h.value / total) * 100 : 0;
            return (
              <tr
                key={(h.ticker ?? h.name) + h.sides.join()}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-2 py-1 font-semibold text-[var(--amber)]">
                  {h.ticker ?? "—"}
                </td>
                <td className="px-2 py-1 text-[var(--foreground)]">{h.name}</td>
                <td className="px-2 py-1">
                  <SideTag sides={h.sides} />
                </td>
                <td className="px-2 py-1 text-right text-[var(--foreground)]">
                  {fmtUsd(h.value)}
                </td>
                <td className="px-2 py-1 text-right">
                  <span className="relative inline-flex w-14 items-center justify-end">
                    <span
                      className="absolute inset-y-0 left-0 bg-[rgba(255,165,0,0.14)]"
                      style={{ width: `${(h.value / max) * 100}%` }}
                    />
                    <span className="relative text-[var(--dim)]">
                      {weight.toFixed(1)}%
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ThemeBars({ slices }: { slices: ThemeSlice[] }) {
  return (
    <div className="space-y-1.5 p-2">
      {slices.map((s) => (
        <div key={s.theme} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate font-mono text-[10px] uppercase tracking-wider text-[var(--foreground)]">
            {s.label}
          </span>
          <div className="relative h-3 flex-1 bg-[var(--panel-head)]">
            <span
              className="absolute inset-y-0 left-0"
              style={{
                width: `${s.weight}%`,
                background: THEME_COLOR[s.theme] ?? "var(--amber)",
                opacity: 0.7,
              }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-[10px] text-[var(--dim)]">
            {fmtUsd(s.value)} · {s.weight.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SituationalAwarenessPortfolio({
  portfolio,
  copyBook,
  putBook,
  themes,
}: {
  portfolio: Portfolio;
  copyBook: Holding[];
  putBook: Holding[];
  themes: ThemeSlice[];
}) {
  const copyTotal = copyBook.reduce((s, h) => s + h.value, 0);
  const putTotal = putBook.reduce((s, h) => s + h.value, 0);

  return (
    <div className="space-y-1">
      <Panel
        code="ALLOC"
        title="Long book by theme — where the AI-buildout capital is going"
      >
        <ThemeBars slices={themes} />
      </Panel>

      <Panel
        code="COPY"
        title="The copy book — directional longs worth shadowing"
        asOf={portfolio.as_of}
      >
        <p className="border-b border-[var(--border)] px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[var(--dim)]">
          The clean, replicable part of the book: common stock + call options on
          the picks-and-shovels names (power, miners, compute, memory). Put hedges
          are excluded — see below. Combined notional {fmtUsd(copyTotal)}.
        </p>
        <HoldingsTable rows={copyBook} total={portfolio.total_value} />
      </Panel>

      <Panel
        code="HEDGE"
        title="The put / hedge book — context, not a copy target"
        asOf={portfolio.as_of}
      >
        <p className="border-b border-[var(--border)] px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[var(--dim)]">
          Notional put exposure on crowded semis ({fmtUsd(putTotal)}). These are
          reported at the underlying&apos;s notional value, not premium at risk, and
          several sit opposite longs/calls on the same name — read as spreads/hedges,
          not outright shorts.
        </p>
        <HoldingsTable rows={putBook} total={portfolio.total_value} />
      </Panel>

      <Panel code="NOTE" title="How to read this book">
        <ul className="space-y-1.5 p-2 font-mono text-[10px] leading-relaxed text-[var(--dim)]">
          {portfolio.caveats.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-[var(--amber-dim)]">▸</span>
              <span>{c}</span>
            </li>
          ))}
          <li className="flex gap-2 pt-1">
            <span className="shrink-0 text-[var(--amber-dim)]">▸</span>
            <span>
              Source:{" "}
              <a
                href={portfolio.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--cyan-term)] underline underline-offset-4 hover:text-[var(--amber)]"
              >
                {portfolio.source}
              </a>{" "}
              · as of {portfolio.as_of} · filed {portfolio.filed}.
            </span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
