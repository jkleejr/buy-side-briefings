import { getTickerStrip } from "@/lib/markets";
import LiveTicker from "./live-ticker";

export const revalidate = 60;

// Server shell: fetches the opening snapshot so the tape is populated on first
// paint (no layout shift), then LiveTicker takes over polling + tick-flashing.
export default async function TickerStrip() {
  const quotes = await getTickerStrip();
  return <LiveTicker initial={quotes} />;
}
