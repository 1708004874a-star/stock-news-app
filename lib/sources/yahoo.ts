import { RawArticle, NewsFetcher } from "./types";

export const fetchYahooNews: NewsFetcher = async ({ symbol, stockId }) => {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=15`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!res.ok) return [];

    const data: YahooSearchResponse = await res.json();

    return (data.news || []).map((n) => ({
      title: n.title,
      snippet: (n.publisher || "") + " - " + n.title,
      url: n.link,
      source: "yahoo" as const,
      publishedAt: new Date(n.providerPublishTime * 1000),
      stockId,
    }));
  } catch {
    return [];
  }
};

interface YahooSearchResponse {
  news?: YahooNewsItem[];
}

interface YahooNewsItem {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: number;
}
