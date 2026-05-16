"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

export type ChartType = "line" | "candle";

type ContextValue = {
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  toggle: () => void;
};

const ChartTypeContext = createContext<ContextValue>({
  chartType: "line",
  setChartType: () => {},
  toggle: () => {},
});

/**
 * Global chart-type setting. One toggle in the header flips every chart on
 * the site between line and candlestick view. Persisted to localStorage so
 * the preference survives refresh and route navigation.
 */
export function ChartTypeProvider({ children }: { children: React.ReactNode }) {
  const [chartType, setChartTypeState] = useState<ChartType>(() => {
    // Lazy initializer runs once per app load. Server returns "line";
    // client checks localStorage so the first render reflects the user's
    // saved preference. Worst case is a one-frame line→candle flicker
    // on initial load, which is acceptable for a UI preference.
    if (typeof window === "undefined") return "line";
    try {
      const v = localStorage.getItem("chartType");
      return v === "candle" ? "candle" : "line";
    } catch {
      return "line";
    }
  });

  const setChartType = useCallback((t: ChartType) => {
    setChartTypeState(t);
    try {
      localStorage.setItem("chartType", t);
    } catch {
      // ignore — preference just won't persist
    }
  }, []);

  const toggle = useCallback(() => {
    setChartTypeState((prev) => {
      const next: ChartType = prev === "candle" ? "line" : "candle";
      try {
        localStorage.setItem("chartType", next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <ChartTypeContext.Provider value={{ chartType, setChartType, toggle }}>
      {children}
    </ChartTypeContext.Provider>
  );
}

export function useChartType(): ContextValue {
  return useContext(ChartTypeContext);
}
