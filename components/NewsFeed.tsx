"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsCard } from "./NewsCard";
import { FilterBar, MarketFilter } from "./FilterBar";

interface NewsItem {
  id: number;
  title: string;
  aiSummary: string | null;
  keyPoints: string[] | null;
  verificationStatus: "verified" | "unverified";
  sourceCount: number;
  publishedAt: string;
  stock: { symbol: string; nameCn: string; market: string } | null;
  sources: { title: string; url: string; source: string; publishedAt: string }[];
}

export function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [market, setMarket] = useState<MarketFilter>("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (market !== "ALL") params.set("market", market);
      if (verifiedOnly) params.set("verified", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [market, verifiedOnly]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div>
      <FilterBar
        selected={market}
        onSelect={setMarket}
        verifiedOnly={verifiedOnly}
        onVerifiedToggle={setVerifiedOnly}
      />
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary text-sm">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-secondary text-sm">
          暂无新闻
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <NewsCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
