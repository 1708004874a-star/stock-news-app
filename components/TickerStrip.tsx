"use client";

import { useEffect, useState } from "react";

interface StockSnapshot {
  symbol: string;
  nameCn: string;
  price: number | null;
  changePct: number | null;
}

export function TickerStrip() {
  const [stocks, setStocks] = useState<StockSnapshot[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/market");
        const data = await res.json();
        setStocks(data);
      } catch {}
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (stocks.length === 0) return null;

  return (
    <div className="border-b border-border bg-surface overflow-hidden">
      <div className="flex gap-0 overflow-x-auto px-4 py-2">
        {stocks.map((s) => (
          <div
            key={s.symbol}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-default min-w-[120px]"
          >
            <div className="flex flex-col">
              <span className="text-xs text-text-secondary leading-none">
                {s.nameCn}
              </span>
              <span className="text-sm font-mono tabular-nums font-medium">
                {s.price != null ? s.price.toFixed(2) : "—"}
              </span>
            </div>
            {s.changePct != null && (
              <span
                className={`text-xs font-mono tabular-nums font-medium ${
                  s.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {s.changePct >= 0 ? "+" : ""}
                {s.changePct.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
