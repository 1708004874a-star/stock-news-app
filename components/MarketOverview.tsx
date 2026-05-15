"use client";

import { useEffect, useState } from "react";

interface StockSnapshot {
  symbol: string;
  name: string;
  nameCn: string;
  market: string;
  price: number | null;
  changePct: number | null;
  latestHeadline: string | null;
}

export function MarketOverview() {
  const [stocks, setStocks] = useState<StockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market");
        const data = await res.json();
        setStocks(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-text-secondary text-sm">
        加载中...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-secondary text-xs">
            <th className="text-left py-2 px-3 font-medium">标的</th>
            <th className="text-left py-2 px-3 font-medium">市场</th>
            <th className="text-right py-2 px-3 font-medium">价格</th>
            <th className="text-right py-2 px-3 font-medium">涨跌幅</th>
            <th className="text-left py-2 px-3 font-medium">最新新闻</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr
              key={s.symbol}
              className="border-b border-border/50 hover:bg-surface-hover transition-colors"
            >
              <td className="py-2.5 px-3">
                <span className="font-medium">{s.nameCn}</span>
                <span className="text-text-secondary text-xs ml-1.5">
                  {s.symbol}
                </span>
              </td>
              <td className="py-2.5 px-3 text-text-secondary text-xs">
                {marketLabel(s.market)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                {s.price != null ? s.price.toFixed(2) : "—"}
              </td>
              <td
                className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                  s.changePct != null
                    ? s.changePct >= 0
                      ? "text-up"
                      : "text-down"
                    : "text-text-secondary"
                }`}
              >
                {s.changePct != null
                  ? `${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(2)}%`
                  : "—"}
              </td>
              <td className="py-2.5 px-3 text-xs text-text-secondary max-w-[250px] truncate">
                {s.latestHeadline || "暂无"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function marketLabel(market: string): string {
  switch (market) {
    case "US":
      return "美股";
    case "HK":
      return "港股";
    case "CN":
      return "A股";
    case "INDEX":
      return "指数";
    default:
      return market;
  }
}
