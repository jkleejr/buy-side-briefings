import { getAllBriefings } from "@/lib/data";
import BriefingsFilters from "@/components/briefings-filters";

export const metadata = { title: "Reports" };

export default function BriefingsArchivePage() {
  const items = getAllBriefings();
  return (
    <div className="mx-auto max-w-5xl space-y-1 px-4 pb-14 pt-[39px] sm:px-6">
      <header className="space-y-1 pb-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Reports
        </h1>
      </header>
      <BriefingsFilters items={items} />
    </div>
  );
}
