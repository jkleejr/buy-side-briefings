"use client";

import { useEffect, useState } from "react";

export default function LearnToggle() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-learn");
    setOn(cur !== "off");
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.setAttribute("data-learn", next ? "on" : "off");
    try {
      localStorage.setItem("learnMode", next ? "on" : "off");
    } catch {
      // ignore
    }
  }

  const isOn = on ?? true;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isOn ? "Hover-to-learn tooltips: ON. Click to disable." : "Hover-to-learn tooltips: OFF. Click to enable."}
      aria-pressed={isOn}
      className={
        "flex items-center gap-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors sm:px-1.5 sm:py-0.5 " +
        (isOn
          ? "border-[var(--amber)] text-[var(--amber)] hover:bg-[rgba(255,165,0,0.08)]"
          : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--amber)] hover:border-[var(--amber-dim)]")
      }
    >
      <span className={isOn ? "text-[var(--amber)]" : "text-[var(--dim)]"}>ⓘ</span>
      <span>Learn {isOn ? "ON" : "OFF"}</span>
    </button>
  );
}
