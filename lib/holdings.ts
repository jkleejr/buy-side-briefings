"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// The user's holdings — what they actually own. Stored in this browser only
// (localStorage), private, no account. Ticker is required; shares and cost
// basis are optional and unlock P&L-aware relevance ("your NVDA is below your
// $190 basis"). Kept separate from the watchlist (bsb_watchlist_v1), which is
// "considering" rather than "owns."
// ---------------------------------------------------------------------------

const KEY = "bsb_holdings_v1";

export type Holding = {
  /** Uppercased ticker as the user entered it (e.g. "NVDA", "BTC-USD"). */
  symbol: string;
  name: string;
  /** Optional position size. */
  shares?: number;
  /** Optional average cost (per share / per unit), same currency as the quote. */
  costBasis?: number;
  /** ISO timestamp added — used only for stable ordering. */
  addedAt: string;
};

function load(): Holding[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Holding[]) : [];
  } catch {
    return [];
  }
}

function save(items: Holding[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode / quota — still works for the session */
  }
}

/**
 * React hook over the holdings store. Returns the list plus add/remove/update
 * helpers. `mounted` guards against hydration mismatch (localStorage is only
 * available client-side, so the first server render must show a neutral state).
 */
export function useHoldings() {
  const [mounted, setMounted] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const firstRun = useRef(true);

  useEffect(() => {
    setHoldings(load());
    setMounted(true);
  }, []);

  // Persist on every change after the initial load.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (mounted) save(holdings);
  }, [holdings, mounted]);

  const add = useCallback((h: Omit<Holding, "addedAt">) => {
    const symbol = h.symbol.toUpperCase();
    setHoldings((prev) => {
      if (prev.some((p) => p.symbol === symbol)) return prev;
      return [
        { ...h, symbol, addedAt: new Date().toISOString() },
        ...prev,
      ];
    });
  }, []);

  const remove = useCallback((symbol: string) => {
    const sym = symbol.toUpperCase();
    setHoldings((prev) => prev.filter((p) => p.symbol !== sym));
  }, []);

  const update = useCallback(
    (symbol: string, patch: Partial<Pick<Holding, "shares" | "costBasis">>) => {
      const sym = symbol.toUpperCase();
      setHoldings((prev) =>
        prev.map((p) => (p.symbol === sym ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  return { mounted, holdings, add, remove, update };
}
