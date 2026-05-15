import { RawArticle, NewsFetcher } from "./types";

function buildSearchQuery(name: string, nameCn: string, market: string): string {
  if (market === "CN" || market === "HK") {
    const query = encodeURIComponent(`${nameCn} ${name} 股票`);
    return `https://news.google.com/rss/search?q=${query}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  }
  const query = encodeURIComponent(`${name} stock`);
  return `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
}

export const fetchGoogleNews: NewsFetcher = async ({ name, nameCn, market, stockId }) => {
  try {
    const url = buildSearchQuery(name, nameCn, market);
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) return [];

    const text = await res.text();

    const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: RawArticle[] = [];

    for (const item of items.slice(0, 15)) {
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
