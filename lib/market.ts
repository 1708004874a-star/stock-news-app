import { prisma } from "./db";
import { TRACKED_STOCKS } from "./stocks";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

export async function refreshMarketData(): Promise<void> {
  const results = await Promise.allSettled(
    TRACKED_STOCKS.map((s) => fetchStockPrice(s.symbol))
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const { symbol, price, changePct } = result.value;
      await prisma.stock.updateMany({
        where: { symbol },
        data: { price, changePct, updatedAt: new Date() },
      });
    }
  }
}

async function fetchStockPrice(
  symbol: string
): Promise<{ symbol: string; price: number; changePct: number } | null> {
  // Try Finnhub first
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.c != null && data.c > 0) {
        return {
          symbol,
          price: data.c,
          changePct: data.dp ?? 0,
        };
      }
    }
  } catch {}

  // Fallback: Yahoo Finance v8
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        return {
          symbol,
          price: meta.regularMarketPrice,
          changePct: meta.regularMarketChangePercent ?? 0,
        };
      }
    }
  } catch {}

  return null;
}
