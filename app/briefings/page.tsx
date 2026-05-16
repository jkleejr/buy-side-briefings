import { getAllBriefings } from "@/lib/data";
import BriefingsFilters from "@/components/briefings-filters";

export const metadata = { title: "Briefings Archive — Buy-Side Briefings" };

export default function BriefingsArchivePage() {
  const items = getAllBriefings();
  return (
    <div className="space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Briefings archive
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber-dim)]">
          Every briefing published · filter by routine · verdict · search
        </p>
      </header>
      <BriefingsFilters items={items} />
    </div>
  );
}
