import { RawArticle, NewsFetcher } from "./types";

interface QueryConfig {
  url: string;
  limit: number;
}

function buildEnQuery(name: string): QueryConfig {
  return {
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(name + " stock")}&hl=en-US&gl=US&ceid=US:en`,
    limit: 10,
  };
}

function buildZhQuery(nameCn: string): QueryConfig {
  return {
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(nameCn + " 股票")}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`,
    limit: 10,
  };
}

async function fetchFromQuery(query: QueryConfig, stockId: number): Promise<RawArticle[]> {
  const res = await fetch(query.url, { next: { revalidate: 0 } });
  if (!res.ok) return [];

  const text = await res.text();
  const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: RawArticle[] = [];

  for (const item of items.slice(0, query.limit)) {
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
}

export const fetchGoogleNews: NewsFetcher = async ({ name, nameCn, market, stockId }) => {
  try {
    const isCjk = market === "CN" || market === "HK";

    if (isCjk) {
      // Fetch English and Chinese queries in parallel for CN/HK stocks
      const [enArticles, zhArticles] = await Promise.allSettled([
        fetchFromQuery(buildEnQuery(name), stockId),
        fetchFromQuery(buildZhQuery(nameCn), stockId),
      ]);

      const en = enArticles.status === "fulfilled" ? enArticles.value : [];
      const zh = zhArticles.status === "fulfilled" ? zhArticles.value : [];

      // Deduplicate by URL across both result sets
      const seen = new Set<string>();
      const combined: RawArticle[] = [];
      for (const article of [...en, ...zh]) {
        if (!seen.has(article.url)) {
          seen.add(article.url);
          combined.push(article);
        }
      }
      return combined;
    }

    return fetchFromQuery(buildEnQuery(name), stockId);
  } catch {
    return [];
  }
};
