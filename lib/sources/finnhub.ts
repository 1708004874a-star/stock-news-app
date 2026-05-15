import { RawArticle, NewsFetcher } from "./types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY!;

export const fetchFinnhubNews: NewsFetcher = async ({ symbol, stockId }) => {
  if (!API_KEY) return [];

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 2);
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = new Date().toISOString().split("T")[0];

    const res = await fetch(
      `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${API_KEY}`
    );

    if (!res.ok) return [];

    const data: FinnhubArticle[] = await res.json();

    return data.slice(0, 20).map((a) => ({
      title: a.headline,
      snippet: a.summary.slice(0, 300),
      url: a.url,
      source: "finnhub" as const,
      publishedAt: new Date(a.datetime * 1000),
      stockId,
    }));
  } catch {
    return [];
  }
};

interface FinnhubArticle {
  headline: string;
  summary: string;
  url: string;
  datetime: number;
}
