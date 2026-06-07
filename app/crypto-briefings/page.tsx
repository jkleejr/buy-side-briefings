import Link from "next/link";
import { getAllCryptoVerdicts } from "@/lib/data";
import CryptoBriefingCard from "@/components/crypto-briefing-card";

export const metadata = {
  title: "Crypto Briefings — Buy-Side Briefings",
  description:
    "Daily Bitcoin and Ethereum market briefings. Verdict, conviction, BTC/ETH snapshot, key levels, and the risk-sentiment read — published once per day.",
};

export const revalidate = 300;

export default function CryptoBriefingsPage() {
  const verdicts = getAllCryptoVerdicts();

  return (
    <div className="space-y-3">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Crypto briefings
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Daily · Bitcoin + Ethereum · verdict + key levels + risk-sentiment read
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-[var(--dim)]">
          One crypto briefing per day: the call, the conviction, the BTC/ETH snapshot, and where the
          levels matter — read alongside the{" "}
          <Link href="/crypto" className="text-[var(--cyan-term)] hover:underline">
            live BTC/ETH charts
          </Link>
          . Click <span className="text-[var(--cyan-term)]">FULL ▸</span> on any card for the
          long-form analysis with citations, levels, and bear case.
        </p>
      </header>

      {verdicts.length === 0 ? (
        <div className="border border-[var(--border)] bg-[var(--panel)] p-6 text-center font-mono text-[11px] text-[var(--dim)]">
          No crypto briefings yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {verdicts.map((v) => (
            <CryptoBriefingCard key={`${v.date}-${v.window}`} verdict={v} />
          ))}
        </div>
      )}
    </div>
  );
}
