import { prisma } from "./db";
import { TRACKED_STOCKS } from "./stocks";

export async function refreshMarketData(): Promise<void> {
  const symbols = TRACKED_STOCKS.map((s) => s.symbol);

  try {
    const symbolsParam = symbols.join(",");
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!res.ok) return;

    const data: YahooQuoteResponse = await res.json();
    const results = data.quoteResponse?.result || [];

    for (const quote of results) {
      await prisma.stock.updateMany({
        where: { symbol: quote.symbol },
        data: {
          price: quote.regularMarketPrice ?? undefined,
          changePct: quote.regularMarketChangePercent ?? undefined,
          updatedAt: new Date(),
        },
      });
    }
  } catch {
    // Market data is non-critical — silently fail
  }
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuote[];
  };
}

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
}
