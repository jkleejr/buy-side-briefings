import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getAllBriefings,
  getBriefing,
  getCalendarEvents,
  getVerdictByRef,
} from "@/lib/data";
import { getSpxDailyCloses, type DailyClose } from "@/lib/markets";
import { scoreVerdict, type ReturnWindow } from "@/lib/verdict-scoring";
import {
  formatBriefingTitle,
  formatPct,
  formatRelativeTime,
  readMinutes,
} from "@/lib/utils";
import Panel from "@/components/panel";
import type { RegimeIndicator, SupportingPoint } from "@/lib/data";

export const revalidate = 300;

export async function generateStaticParams() {
  return getAllBriefings().map((b) => ({ routine: b.routine, slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ routine: string; slug: string }>;
}) {
  const { routine, slug } = await params;
  const briefing = getBriefing(routine, slug);
  if (!briefing) return { title: "Briefing not found" };
  return { title: formatBriefingTitle(briefing) };
}

function ScoreCell({
  label,
  w,
  isRight,
}: {
  label: string;
  w: ReturnWindow;
  isRight: boolean | null;
}) {
  const pct = w.pct;
  const cls =
    pct === null
      ? "text-[var(--dim)]"
      : pct > 0
        ? "text-[var(--up)]"
        : pct < 0
          ? "text-[var(--down)]"
          : "text-[var(--dim)]";
  const verdict =
    w.pending
      ? "pending"
      : isRight === null
        ? "informational"
        : isRight
          ? "right"
          : "wrong";
  const verdictCls =
    isRight === null
      ? "text-[var(--dim)]"
      : isRight
        ? "text-[var(--up)]"
        : "text-[var(--down)]";
  return (
    <div className="border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-[16px] ${cls}`}>
        {w.pending ? "—" : pct === null ? "—" : formatPct(pct)}
      </div>
      <div className={`font-mono text-[10px] uppercase tracking-widest ${verdictCls}`}>
        {verdict}
      </div>
    </div>
  );
}

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ routine: string; slug: string }>;
}) {
  const { routine, slug } = await params;
  const briefing = getBriefing(routine, slug);
  if (!briefing) notFound();

  const verdictRef = briefing.verdict_ref;
  const verdict = verdictRef ? getVerdictByRef(verdictRef) : null;

  // SPX scoring only applies to the markets routine; crypto verdicts carry a
  // crypto snapshot and aren't graded against the S&P 500.
  const scorable = verdict && verdict.routine === "markets" ? verdict : null;
  const spxSeries = scorable ? await getSpxDailyCloses(9) : [];
  const score = scorable ? scoreVerdict(scorable, spxSeries) : null;

  const points = verdict?.verdict.supporting_data ?? [];
  const fullReadMin = readMinutes(briefing.body);

  // The regime picture: SPX vs its floor (10 sessions up to the briefing date)
  // and the VIX gate. Drawn from numbers the verdict already carries.
  const spxGate = verdict?.regime_risk?.find(
    (r) => /spx/i.test(r.name) && r.trigger_below != null,
  );
  const vixGate = verdict?.regime_risk?.find(
    (r) => /vix/i.test(r.name) && r.trigger_above != null,
  );
  const chartSeries = spxGate
    ? spxSeries.filter((d) => d.date <= briefing.date).slice(-10)
    : [];

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/briefings"
        className="font-mono text-[10px] uppercase tracking-widest text-[var(--cyan-term)] hover:underline"
      >
        ◂ ALL BRIEFINGS
      </Link>

      <header className="space-y-2 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--amber-dim)]">
          <span>{routine}</span>
          <span>·</span>
          <span>
            {briefing.date} {briefing.window ?? ""}
          </span>
          {briefing.is_seed && (
            <>
              <span>·</span>
              <span className="border border-[var(--border)] px-1 text-[var(--dim)]">
                SEED
              </span>
            </>
          )}
        </div>
        <h1 className="font-serif text-[27px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--foreground)] sm:text-[31px]">
          {formatBriefingTitle(briefing)}
        </h1>
      </header>

      {verdict ? (
        <div className="space-y-7 pt-2">
          <Tier label="30 seconds" accent>
            <VerdictHead
              verdict={verdict}
              bullets={glanceBullets(points)}
              next={nextCatalyst(briefing.date)}
            />
          </Tier>

          {chartSeries.length >= 4 && spxGate && (
            <RegimeFigure series={chartSeries} floor={spxGate} vix={vixGate} />
          )}

          {points.length > 0 && (
            <Tier label={`${readMinutes(points.map((p) => p.label).join(" "))} min · the evidence`}>
              <Evidence points={points} />
            </Tier>
          )}

          <Tier label={`The full read · ${fullReadMin} min`}>
            <FullRead body={briefing.body} />
          </Tier>
        </div>
      ) : (
        <div className="briefing-body">
          <BriefingMarkdown source={briefing.body} />
        </div>
      )}

      {verdict && score && (
        <Panel
          code="SCORE"
          title="Was this call right?"
        >
          <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-3">
            <ScoreCell label="+1d" w={score.d1} isRight={score.right_d1} />
            <ScoreCell label="+5d" w={score.d5} isRight={score.right_d5} />
            <ScoreCell
              label="+20d"
              w={score.d20}
              isRight={score.right_d20}
            />
          </div>
          {score.base_close !== null && (
            <div className="border-t border-[var(--border)] px-2 py-1 font-mono text-[10px] text-[var(--dim)]">
              SPX base close {score.base_date} ·{" "}
              {score.base_close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
          )}
        </Panel>
      )}
    </article>
  );
}

function BriefingMarkdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="mt-6 mb-2 font-mono text-base font-semibold uppercase tracking-wider text-[var(--amber)]">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 mb-1.5 font-mono text-sm font-semibold tracking-wider text-[var(--amber-dim)]">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-2 leading-relaxed text-[var(--foreground)]">{children}</p>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-[var(--cyan-term)] underline underline-offset-4 hover:text-[var(--amber)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-[var(--foreground)]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-[var(--foreground)]">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--amber)]">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-[var(--amber-dim)] pl-3 italic text-[var(--dim)]">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="border border-[var(--border)] bg-[var(--panel-head)] px-1 py-0.5 text-[12px] text-[var(--amber)]">
            {children}
          </code>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto border border-[var(--border)]">
            <table className="w-full border-collapse font-mono text-[11px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-[var(--border)] bg-[var(--panel-head)] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[var(--amber-dim)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-[var(--border)] px-2 py-1 text-[var(--foreground)]">
            {children}
          </td>
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

// ---------------------------------------------------------------------------
// Progressive disclosure — the briefing is tiered by how much time the reader
// has: a 30-second top (stance + three glanceable bullets + regime chips), the
// sourced evidence a scroll below, and the full read last (collapsed by
// default on mobile). Same words, ordered by reader time.
// ---------------------------------------------------------------------------

function Tier({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`border-l-2 pl-4 sm:pl-5 ${
        accent ? "border-[var(--cyan-term)]" : "border-[var(--border-strong)]"
      }`}
    >
      <div
        className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${
          accent ? "text-[var(--cyan-term)]" : "text-[var(--faint)]"
        }`}
      >
        {label}
      </div>
      {children}
    </section>
  );
}

const STANCE: Record<string, { label: string; bg: string }> = {
  buy: { label: "Buy", bg: "#2f7d4f" },
  hold: { label: "Hold", bg: "#b8842a" },
  step_aside: { label: "Step aside", bg: "#b06a1e" },
  aside: { label: "Step aside", bg: "#b06a1e" },
  bearish: { label: "Bearish", bg: "#b0392f" },
};

/** First sentence of a longer rationale, for a headline fallback. */
function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const clean = text.replace(/^\([0-9]+\)\s*/, "").replace(/^★+\s*/, "").trim();
  const m = clean.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : clean).trim();
}

function clampText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim() + "…";
}

/** Strip the analyst's priority marks (★★ / ★ / ⚠) off a point label. */
function stripMarks(label: string): string {
  return label.replace(/^[★⚠️\s]+/u, "").trim();
}

function starRank(label: string): number {
  if (label.startsWith("★★")) return 2;
  if (label.startsWith("★")) return 1;
  return 0;
}

/**
 * The three bullets anyone can read at a glance: the highest-priority points,
 * cut to their first clause. The full sourced versions live one tier below.
 */
function glanceBullets(points: SupportingPoint[]): string[] {
  return [...points]
    .sort((a, b) => starRank(b.label) - starRank(a.label))
    .slice(0, 3)
    .map((p) => {
      const clean = stripMarks(p.label);
      let cut = clean.length;
      for (const sep of [";", ". "]) {
        const i = clean.indexOf(sep, 30);
        if (i > 0 && i < cut) cut = i;
      }
      return clampText(clean.slice(0, cut), 190);
    });
}

/** The next dated catalyst after this briefing, for the NEXT chip. */
function nextCatalyst(
  briefingDate: string,
): { token: string; day: string } | null {
  const e = getCalendarEvents().find((ev) => ev.date > briefingDate);
  if (!e) return null;
  // Only meaningful while the event is actually "next" — the curated calendar
  // rolls forward, so for old briefings the nearest event may be unrelated.
  const gapDays =
    (Date.parse(e.date) - Date.parse(briefingDate)) / 86_400_000;
  if (!Number.isFinite(gapDays) || gapDays > 10) return null;
  // A readable token: a macro acronym from the label if present, else the
  // event kind — unless it's the catch-all OTHER, where the label's first
  // word (usually a ticker: "SKHY regular trading…") says far more.
  const token =
    /\b(CPI|FOMC|NFP|PCE|GDP)\b/.exec(e.label)?.[1] ??
    (e.kind.toUpperCase() !== "OTHER"
      ? e.kind
      : e.label.split(/\s+/)[0].replace(/[^A-Za-z0-9-]/g, "").slice(0, 6));
  const day = new Date(`${e.date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  return { token: token.toUpperCase(), day };
}

/** Shorten a regime indicator's name to a chip label: "SPX vs 7,460 …" → "SPX". */
function chipName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+(?:vs|Gate|Yield|dual|floor)/i)[0]
    .trim();
}

function chipValue(value: number, unit?: string): string {
  if (unit === "%") return `${value}%`;
  if (unit === "$")
    return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`;
  return value >= 1000 ? value.toLocaleString("en-US") : String(value);
}

function RegimeChips({
  regime,
  next,
}: {
  regime?: RegimeIndicator[];
  next: { token: string; day: string } | null;
}) {
  const rows = (regime ?? []).slice(0, 6);
  if (!rows.length && !next) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {rows.map((r, i) => {
        const breached =
          (r.trigger_above != null && r.value >= r.trigger_above) ||
          (r.trigger_below != null && r.value <= r.trigger_below);
        const gate =
          r.trigger_above != null
            ? `≥ ${chipValue(r.trigger_above, r.unit)}`
            : r.trigger_below != null
              ? `≤ ${chipValue(r.trigger_below, r.unit)}`
              : null;
        return (
          <span
            key={i}
            className="inline-flex items-baseline gap-2 rounded-sm border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 font-mono text-[11.5px] tabular-nums"
          >
            <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--faint)]">
              {chipName(r.name)}
            </span>
            <span
              className="font-semibold"
              style={{ color: breached ? "var(--down)" : "var(--foreground)" }}
            >
              {chipValue(r.value, r.unit)}
            </span>
            {gate && <span className="text-[var(--faint)]">{gate}</span>}
          </span>
        );
      })}
      {next && (
        <span className="inline-flex items-baseline gap-2 rounded-sm border border-[color-mix(in_srgb,var(--amber)_45%,transparent)] bg-[color-mix(in_srgb,var(--amber)_8%,transparent)] px-2.5 py-1.5 font-mono text-[11.5px]">
          <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--faint)]">
            Next
          </span>
          <span className="font-semibold text-[var(--amber)]">
            {next.token} · {next.day}
          </span>
        </span>
      )}
    </div>
  );
}

function VerdictHead({
  verdict,
  bullets,
  next,
}: {
  verdict: {
    verdict: {
      code: string;
      conviction: string;
      rationale_short: string;
      headline?: string;
    };
    regime_risk?: RegimeIndicator[];
    generated_at: string;
  };
  bullets: string[];
  next: { token: string; day: string } | null;
}) {
  const stance = STANCE[verdict.verdict.code] ?? { label: verdict.verdict.code, bg: "#6d6a62" };
  const headline =
    verdict.verdict.headline?.trim() || firstSentence(verdict.verdict.rationale_short);
  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-sm px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-white"
          style={{ background: stance.bg }}
        >
          {stance.label}
        </span>
        <span className="font-mono text-[12px] capitalize text-[var(--dim)]">
          {verdict.verdict.conviction} conviction
        </span>
        <span className="ml-auto font-mono text-[11px] text-[var(--faint)]">
          generated {formatRelativeTime(verdict.generated_at)}
        </span>
      </div>
      {headline && (
        <p className="mt-3 max-w-[40ch] text-[21px] font-semibold leading-[1.3] tracking-[-0.005em] text-[var(--foreground)] [text-wrap:balance]">
          {headline}
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-3 max-w-[62ch] list-disc space-y-1.5 pl-5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[15.5px] leading-[1.5] text-[var(--ink-2)]">
              {b}
            </li>
          ))}
        </ul>
      )}
      <RegimeChips regime={verdict.regime_risk} next={next} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The evidence — every sourced point, bold lead + link. First three visible,
// the rest behind a native <details> expander.
// ---------------------------------------------------------------------------

function sourceLabel(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
    const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return name.toUpperCase().slice(0, 10);
  } catch {
    return null;
  }
}

/** Split "June CPI preview (BLS...): consensus …" into a bold lead + the rest. */
function splitLead(label: string): { lead: string | null; rest: string } {
  const clean = stripMarks(label);
  const m = clean.match(/^(.{3,60}?)(?::\s+|\s+—\s+)/);
  if (m) return { lead: m[1], rest: clean.slice(m[0].length) };
  return { lead: null, rest: clean };
}

function EvidenceRow({ point }: { point: SupportingPoint }) {
  const { lead, rest } = splitLead(point.label);
  const src = sourceLabel(point.url);
  return (
    <div className="text-[15px] leading-[1.55] text-[var(--ink-3)]">
      {lead && (
        <b className="font-semibold text-[var(--foreground)]">{lead}</b>
      )}
      {lead ? " — " : ""}
      {rest}{" "}
      {point.url && src && (
        <a
          href={point.url}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap font-mono text-[11px] tracking-[0.06em] text-[var(--amber)] hover:underline"
        >
          {src} →
        </a>
      )}
    </div>
  );
}

function Evidence({ points }: { points: SupportingPoint[] }) {
  const shown = points.slice(0, 3);
  const more = points.slice(3);
  return (
    <div className="mt-3 space-y-3.5">
      {shown.map((p, i) => (
        <EvidenceRow key={i} point={p} />
      ))}
      {more.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none font-mono text-[12px] italic text-[var(--faint)] hover:text-[var(--dim)]">
            <span className="group-open:hidden">
              + {more.length} more sourced point{more.length > 1 ? "s" : ""} ▾
            </span>
            <span className="hidden group-open:inline">
              − show fewer ▴
            </span>
          </summary>
          <div className="mt-3.5 space-y-3.5">
            {more.map((p, i) => (
              <EvidenceRow key={i} point={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The full read — everything the model wrote. Visible on desktop; collapsed
// behind a tap on mobile (CSS-only: a hidden checkbox drives the reveal).
// ---------------------------------------------------------------------------

function FullRead({ body }: { body: string }) {
  const heads =
    body
      .match(/^##\s+(.+)$/gm)
      ?.map((h) => h.replace(/^##\s+/, "").trim().toLowerCase())
      .slice(0, 5) ?? [];
  const contents = heads.length
    ? heads.join(", ").replace(/^./, (c) => c.toUpperCase())
    : "The full analysis";
  return (
    <div>
      <input type="checkbox" id="full-read-toggle" className="peer sr-only" />
      <label
        htmlFor="full-read-toggle"
        className="mt-2 block cursor-pointer text-[14.5px] italic leading-[1.5] text-[var(--faint)] peer-checked:hidden sm:hidden"
      >
        {contents} — tap to expand ▾
      </label>
      <label
        htmlFor="full-read-toggle"
        className="mt-2 hidden cursor-pointer font-mono text-[12px] italic text-[var(--faint)] peer-checked:block sm:peer-checked:hidden"
      >
        − collapse ▴
      </label>
      <div className="briefing-body hidden peer-checked:block sm:block">
        <BriefingMarkdown source={body} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One picture per briefing — SPX vs its regime floor over the ten sessions
// into the briefing, plus the VIX gate as a gauge. No new data: the floor and
// gate are the verdict's own regime_risk numbers.
// ---------------------------------------------------------------------------

function RegimeFigure({
  series,
  floor,
  vix,
}: {
  series: DailyClose[];
  floor: RegimeIndicator;
  vix?: RegimeIndicator;
}) {
  const closes = series.map((d) => d.close);
  const latest = closes[closes.length - 1];
  const floorLevel = floor.trigger_below as number;
  const above = latest - floorLevel;
  const tone = above >= 0 ? "var(--up)" : "var(--down)";

  const W = 320;
  const H = 120;
  const TOP = 12;
  const BOT = 104;
  const min = Math.min(...closes, floorLevel);
  const max = Math.max(...closes);
  const pad = Math.max((max - min) * 0.08, 1);
  const y = (v: number) =>
    BOT - ((v - (min - pad)) / (max + pad - (min - pad))) * (BOT - TOP);
  const x = (i: number) =>
    closes.length > 1 ? (i / (closes.length - 1)) * W : W;
  const line = closes.map((c, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const floorY = y(floorLevel);

  const vixVal = vix?.value;
  const vixGate = vix?.trigger_above;
  const vixPct =
    vixVal != null && vixGate != null
      ? Math.min(100, (vixVal / (vixGate * 1.15)) * 100)
      : null;
  const vixBreached = vixVal != null && vixGate != null && vixVal >= vixGate;

  return (
    <figure className="my-0 grid gap-6 border-y border-[var(--border)] py-5 sm:grid-cols-[1.5fr_1fr] sm:items-center">
      <div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[120px] w-full"
          role="img"
          aria-label={`S&P 500 over its last ten sessions against the ${floorLevel.toLocaleString("en-US")} regime floor`}
        >
          <defs>
            <linearGradient id="spx-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.18" />
              <stop offset="100%" stopColor={tone} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={floorY}
            x2={W}
            y2={floorY}
            stroke="var(--down)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <text
            x="4"
            y={Math.min(floorY + 13, H - 4)}
            fontFamily="var(--mono)"
            fontSize="9"
            fill="var(--down)"
          >
            FLOOR {floorLevel.toLocaleString("en-US")}
          </text>
          <path d={area} fill="url(#spx-fill)" />
          <path d={line} fill="none" stroke={tone} strokeWidth="2" />
          <circle cx={x(closes.length - 1)} cy={y(latest)} r="3.5" fill={tone} />
        </svg>
        <figcaption className="mt-2 font-mono text-[11px] tracking-[0.02em] text-[var(--dim)]">
          SPX {latest.toLocaleString("en-US", { maximumFractionDigits: 0 })} ·{" "}
          <span style={{ color: tone }}>
            {above >= 0 ? "+" : "−"}
            {Math.abs(Math.round(above)).toLocaleString("en-US")}{" "}
            {above >= 0 ? "over" : "below"} the regime floor
          </span>{" "}
          · {closes.length}-session close
        </figcaption>
      </div>
      {vixVal != null && vixGate != null && vixPct != null && (
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
            VIX gate
          </div>
          <div
            className="mt-1 font-mono text-[28px] font-semibold tabular-nums"
            style={{ color: vixBreached ? "var(--down)" : "var(--foreground)" }}
          >
            {vixVal.toFixed(1)}
          </div>
          <div className="font-mono text-[11px] text-[var(--dim)]">
            breaches at {vixGate.toFixed(1)}
          </div>
          <div className="mx-auto mt-3 h-[7px] max-w-[220px] overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${vixPct}%`,
                background: vixBreached ? "var(--down)" : "var(--up)",
              }}
            />
          </div>
          <div className="mt-2 font-mono text-[11px] text-[var(--dim)]">
            {vixBreached
              ? `${(vixVal - vixGate).toFixed(1)} pts through the gate`
              : `${(vixGate - vixVal).toFixed(1)} pts of headroom`}
          </div>
        </div>
      )}
    </figure>
  );
}
