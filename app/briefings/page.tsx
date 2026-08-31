import { getAllBriefings } from "@/lib/data";
import BriefingsFilters from "@/components/briefings-filters";

export const metadata = { title: "Reports Archive" };

export default function BriefingsArchivePage() {
  const items = getAllBriefings();
  return (
    <div className="mx-auto max-w-5xl space-y-1">
      <header className="space-y-1 px-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Reports archive
        </h1>
      </header>
      <BriefingsFilters items={items} />
    </div>
  );
}
