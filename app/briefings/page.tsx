import { getAllBriefings } from "@/lib/data";
import BriefingList from "@/components/briefing-list";

export const metadata = { title: "Briefings Archive — Buy-Side Briefings" };

export default function BriefingsArchivePage() {
  const items = getAllBriefings();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Briefings archive</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Every briefing we&apos;ve published. Most recent first.
        </p>
      </header>
      <BriefingList items={items} />
    </div>
  );
}
