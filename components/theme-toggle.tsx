"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const KEY = "bsb:theme";

/**
 * What the viewer is actually looking at: their explicit choice if they made
 * one, otherwise whatever the OS asked for.
 */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// The theme lives on <html>, not in React, so it's read through an external
// store rather than state — the same shape lib/chart-drawings.ts uses. Two
// things can change it: the OS, and this button.
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
    mq.removeEventListener("change", onChange);
  };
}

/** Null on the server: it can't know the OS preference, and guessing would
 *  hydrate the wrong glyph for half the viewers. */
const serverSnapshot = () => null;

/**
 * Switches between the two grounds — warm paper and dark — and remembers it.
 *
 * Until someone picks a side the site still follows the OS, so a viewer whose
 * laptop flips to dark at sunset gets the dark ground without ever touching
 * this. Choosing here opts out of that and sticks.
 */
export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(
    subscribe,
    currentTheme,
    serverSnapshot,
  );

  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = theme ? `Switch to the ${next} theme` : "Switch theme";

  const choose = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: the theme still applies for this page view.
    }
    listeners.forEach((l) => l());
  };

  return (
    <button
      type="button"
      onClick={choose}
      title={label}
      aria-label={label}
      className="border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] not-italic uppercase tracking-widest text-[var(--dim)] hover:border-[var(--amber-dim)] hover:text-[var(--amber)]"
    >
      {/* Fixed width so the header doesn't shift when the glyph resolves on
          hydration, or later when it swaps. */}
      <span className="inline-block w-[1.1em] text-center">
        {theme === null ? "" : theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
