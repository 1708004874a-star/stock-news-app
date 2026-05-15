import { prisma } from "../db";
import { TRACKED_STOCKS } from "../stocks";
import { fetchFinnhubNews } from "../sources/finnhub";
import { fetchGoogleNews } from "../sources/googlenews";
import { fetchYahooNews } from "../sources/yahoo";
import { RawArticle } from "../sources/types";
import { groupSimilarArticles } from "./dedup";
import { summarizeArticles } from "./summarize";

export async function fetchAndProcessAllNews(): Promise<{
  articlesFetched: number;
  clustersCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const allRawArticles: RawArticle[] = [];

  for (const stock of TRACKED_STOCKS) {
    const dbStock = await prisma.stock.upsert({
      where: { symbol: stock.symbol },
      update: {},
      create: {
        symbol: stock.symbol,
        name: stock.name,
        nameCn: stock.nameCn,
        market: stock.market,
      },
    });

    const fetchers = [fetchFinnhubNews, fetchGoogleNews, fetchYahooNews];
    const results = await Promise.allSettled(
      fetchers.map((fn) =>
        fn({ symbol: stock.symbol, name: stock.name, stockId: dbStock.id })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allRawArticles.push(...result.value);
      } else {
        errors.push(`Fetch error for ${stock.symbol}: ${result.reason}`);
      }
    }
  }

  const groups = groupSimilarArticles(allRawArticles);
  let clustersCreated = 0;

  for (const group of groups) {
    if (group.articles.length === 0) continue;

    const primaryArticle = group.articles[0];
    const stockId = primaryArticle.stockId;

    const existing = await prisma.article.findFirst({
      where: { url: primaryArticle.url },
    });
    if (existing) continue;

    const createdArticles = await Promise.all(
      group.articles.map((a) =>
        prisma.article.create({
          data: {
            stockId: a.stockId,
            title: a.title,
            snippet: a.snippet,
            url: a.url,
            source: a.source,
            publishedAt: a.publishedAt,
          },
        })
      )
    );

    const dbStock = await prisma.stock.findUnique({ where: { id: stockId } });
    const titles = group.articles.map((a) => a.title);

    let aiSummary: string | null = null;
    let keyPoints: string[] = [];
    if (dbStock) {
      const result = await summarizeArticles(dbStock.nameCn, dbStock.symbol, titles);
      if (result) {
        aiSummary = result.summary;
        keyPoints = result.keyPoints;
      }
    }

    const verificationStatus =
      group.sourceTypes.size >= 2 ? "verified" : "unverified";

    await prisma.newsCluster.create({
      data: {
        title: group.canonicalTitle,
        aiSummary,
        keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
        verificationStatus,
        sourceCount: group.sourceTypes.size,
        publishedAt: primaryArticle.publishedAt,
        articles: {
          create: createdArticles.map((a) => ({ articleId: a.id })),
        },
      },
    });

    clustersCreated++;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.newsCluster.deleteMany({ where: { publishedAt: { lt: sevenDaysAgo } } });
  await prisma.article.deleteMany({ where: { publishedAt: { lt: sevenDaysAgo } } });

  return { articlesFetched: allRawArticles.length, clustersCreated, errors };
}
