import { prisma } from "../db";
import { TRACKED_STOCKS } from "../stocks";
import { fetchFinnhubNews } from "../sources/finnhub";
import { fetchGoogleNews } from "../sources/googlenews";
import { fetchYahooNews } from "../sources/yahoo";
import { RawArticle } from "../sources/types";
import { groupSimilarArticles } from "./dedup";
import { summarizeArticles } from "./summarize";

const BATCH_SIZE = 2;

export async function fetchAndProcessNewsBatch(batch: number): Promise<{
  articlesFetched: number;
  clustersCreated: number;
  batchesTotal: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const allRawArticles: RawArticle[] = [];
  const batchesTotal = Math.ceil(TRACKED_STOCKS.length / BATCH_SIZE);

  const start = batch * BATCH_SIZE;
  const batchStocks = TRACKED_STOCKS.slice(start, start + BATCH_SIZE);

  if (batchStocks.length === 0) {
    return { articlesFetched: 0, clustersCreated: 0, batchesTotal, errors: ["Invalid batch"] };
  }

  for (const stock of batchStocks) {
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
        fn({ symbol: stock.symbol, name: stock.name, nameCn: stock.nameCn, market: stock.market, stockId: dbStock.id })
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

  // Cleanup only on last batch
  if (batch === batchesTotal - 1) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.newsCluster.deleteMany({ where: { publishedAt: { lt: sevenDaysAgo } } });
    await prisma.article.deleteMany({ where: { publishedAt: { lt: sevenDaysAgo } } });
  }

  return { articlesFetched: allRawArticles.length, clustersCreated, batchesTotal, errors };
}

export async function fetchAndProcessAllNews(): Promise<{
  articlesFetched: number;
  clustersCreated: number;
  errors: string[];
}> {
  let totalArticles = 0;
  let totalClusters = 0;
  const allErrors: string[] = [];

  for (let b = 0; b < Math.ceil(TRACKED_STOCKS.length / BATCH_SIZE); b++) {
    const result = await fetchAndProcessNewsBatch(b);
    totalArticles += result.articlesFetched;
    totalClusters += result.clustersCreated;
    allErrors.push(...result.errors);
  }

  return { articlesFetched: totalArticles, clustersCreated: totalClusters, errors: allErrors };
}
