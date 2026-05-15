import { RawArticle, NewsFetcher } from "./types";

function buildQuery(name: string, nameCn: string, market: string): string {
  if (market === "CN") {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(nameCn + " " + name + " 股票")}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  }
  if (market === "HK") {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(nameCn + " " + name + " 股價")}&hl=zh-HK&gl=HK&ceid=HK:zh-Hant`;
  }
  return `https://news.google.com/rss/search?q=${encodeURIComponent(name + " stock")}&hl=en-US&gl=US&ceid=US:en`;
}

export const fetchGoogleNews: NewsFetcher = async ({ name, nameCn, market, stockId }) => {
  try {
    const url = buildQuery(name, nameCn, market);
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) return [];

    const text = await res.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: RawArticle[] = [];

    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch && linkMatch) {
        const snippet = descMatch
          ? descMatch[1].replace(/<[^>]*>/g, "").slice(0, 300)
          : "";
        articles.push({
          title: titleMatch[1].trim(),
          snippet,
          url: linkMatch[1].trim(),
          source: "googlenews" as const,
          publishedAt: dateMatch ? new Date(dateMatch[1]) : new Date(),
          stockId,
        });
      }
    }
    return articles;
  } catch {
    return [];
  }
};
