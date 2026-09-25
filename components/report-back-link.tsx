"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CLASS =
  "block w-fit font-mono text-[10px] uppercase tracking-widest text-[var(--cyan)] hover:underline";

/**
 * The link above a report's title goes back where the reader came from. The
 * homepage tags its report links with ?from=today, so a report opened from
 * there offers "Today" back to the homepage; opened from the archive or a
 * shared link it offers the archive. The report page is statically rendered,
 * which is why this reads the query in the browser rather than on the server.
 */
function BackLinkInner() {
  const fromToday = useSearchParams().get("from") === "today";
  return fromToday ? (
    <Link href="/" className={CLASS}>
      ◂ TODAY
    </Link>
  ) : (
    <Link href="/briefings" className={CLASS}>
      ◂ ALL REPORTS
    </Link>
  );
}

// Until the browser has the query, show the archive link: it is right for
// every visit that did not start on the homepage, and it is a working link
// either way.
const fallback = (
  <Link href="/briefings" className={CLASS}>
    ◂ ALL REPORTS
  </Link>
);

export default function ReportBackLink() {
  return (
    <Suspense fallback={fallback}>
      <BackLinkInner />
    </Suspense>
  );
}
