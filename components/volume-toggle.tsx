"use client";

import { useEffect, useState } from "react";

// Global chart-volume toggle. Mirrors LearnToggle: flips data-volume on <html>
// (read by a CSS rule that shows/hides .chart-volume-bars) and persists the
// choice to localStorage. Default ON. The pre-paint script in app/layout.tsx
// sets the attribute before first paint so there's no flash.
export default function VolumeToggle() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-volume");
    setOn(cur !== "off");
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.setAttribute("data-volume", next ? "on" : "off");
    try {
      localStorage.setItem("volumeMode", next ? "on" : "off");
    } catch {
      // ignore
    }
  }

  const isOn = on ?? true;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isOn ? "Chart volume bars: ON. Click to hide." : "Chart volume bars: OFF. Click to show."}
      aria-pressed={isOn}
      className={
        "flex items-center gap-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors sm:px-1.5 sm:py-0.5 " +
        (isOn
          ? "border-[var(--amber)] text-[var(--amber)] hover:bg-[rgba(255,165,0,0.08)]"
          : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--amber)] hover:border-[var(--amber-dim)]")
      }
    >
      <span className={isOn ? "text-[var(--amber)]" : "text-[var(--dim)]"}>▮</span>
      <span>Vol {isOn ? "ON" : "OFF"}</span>
    </button>
  );
}
