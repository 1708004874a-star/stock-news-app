"use client";

import { useState } from "react";
import { TickerStrip } from "@/components/TickerStrip";
import { NewsFeed } from "@/components/NewsFeed";
import { MarketOverview } from "@/components/MarketOverview";

type Tab = "news" | "overview";

export default function Home() {
  const [tab, setTab] = useState<Tab>("news");

  return (
    <div className="max-w-3xl mx-auto min-h-screen">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold tracking-tight">
          全球股市热点追踪
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          AI 驱动的全球股市新闻聚合 — 追踪美股、港股、A股热点
        </p>
      </header>

      <TickerStrip />

      <div className="px-4 py-3">
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border w-fit mb-4">
          <button
            onClick={() => setTab("news")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "news"
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            全部新闻
          </button>
          <button
            onClick={() => setTab("overview")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "overview"
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            自选概览
          </button>
        </div>

        {tab === "news" ? <NewsFeed /> : <MarketOverview />}
      </div>

      <footer className="text-center text-xs text-text-secondary py-8">
        数据来源：Finnhub / Google News / Yahoo Finance · AI摘要：DeepSeek
      </footer>
    </div>
  );
}
