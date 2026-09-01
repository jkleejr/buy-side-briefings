"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type LevelsChart from "./levels-chart";

/**
 * LevelsChart, loaded off the critical path.
 *
 * The chart is the largest client component on the site by a wide margin
 * (~2,100 lines, the bulk of a 222KB chunk), and /global mounts three of them.
 * Parsing and hydrating that while a reader is clicking cost a 719ms blocked
 * interaction on a throttled run — the INP warning Vercel kept raising on the
 * header nav. Importing it eagerly meant the chunk had to be in hand before the
 * page could respond to anything.
 *
 * Loaded this way the shell paints and stays responsive, and each chart mounts
 * when its own chunk arrives. `ssr: false` because the chart is interactive and
 * fetches its own series client-side anyway — server-rendering it produced
 * markup that was immediately replaced.
 *
 * The placeholder reserves the full variant's exact height (SIZES.full.H = 460
 * plus the toolbar rows above it), so nothing below the chart moves when it
 * arrives. Anything that changes that height has to change here too.
 */
const Chart = dynamic(() => import("./levels-chart"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="h-[556px] w-full animate-pulse rounded-none bg-[var(--panel)]"
    />
  ),
});

export default function LevelsChartLazy(
  props: ComponentProps<typeof LevelsChart>,
) {
  return <Chart {...props} />;
}
