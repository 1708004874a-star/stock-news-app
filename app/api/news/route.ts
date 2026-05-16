import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STALE_MINUTES = 5;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get("market");
  const verifiedOnly = searchParams.get("verified") === "true";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
    // Check staleness and fire background refresh to cron endpoint
    const latestCluster = await prisma.newsCluster.findFirst({
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true },
    });

    const staleMs = STALE_MINUTES * 60 * 1000;
    const isStale = !latestCluster
      || (Date.now() - latestCluster.publishedAt.getTime() > staleMs);

    if (isStale) {
      const batch = Math.floor(Date.now() / 60000) % 8;
      const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : request.nextUrl.origin;
      const secret = process.env.CRON_SECRET || "";
      // Fire-and-forget: sends HTTP request to ourselves, which Vercel handles as separate invocation
      fetch(`${origin}/api/cron/fetch-news?batch=${batch}`, {
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => {});
    }

    const where: Record<string, unknown> = {};

    if (verifiedOnly) {
      where.verificationStatus = "verified";
    }

    if (cursor) {
      where.id = { lt: parseInt(cursor) };
    }

    const clusters = await prisma.newsCluster.findMany({
      where,
      include: {
        articles: {
          include: {
            article: {
              select: {
                id: true,
                title: true,
                url: true,
                source: true,
                stockId: true,
                publishedAt: true,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: limit + 1,
    });

    let filtered = clusters;
    if (market) {
      const stocks = await prisma.stock.findMany({
        where: { market: market as "US" | "HK" | "CN" | "INDEX" },
        select: { id: true },
      });
      const stockIds = new Set(stocks.map((s) => s.id));
      filtered = clusters.filter((c) => {
        const sid = c.articles[0]?.article.stockId;
        return sid !== undefined && stockIds.has(sid);
      });
    }

    const hasMore = filtered.length > limit;
    const items = filtered.slice(0, limit);

    const enriched = await Promise.all(
      items.map(async (c) => {
        const stockId = c.articles[0]?.article.stockId;
        const stock = stockId
          ? await prisma.stock.findUnique({ where: { id: stockId } })
          : null;

        return {
          id: c.id,
          title: c.title,
          aiSummary: c.aiSummary,
          keyPoints: c.keyPoints,
          verificationStatus: c.verificationStatus,
          sourceCount: c.sourceCount,
          publishedAt: c.publishedAt,
          createdAt: c.createdAt,
          stock: stock
            ? { symbol: stock.symbol, nameCn: stock.nameCn, market: stock.market }
            : null,
          sources: c.articles.map((ca) => ({
            title: ca.article.title,
            url: ca.article.url,
            source: ca.article.source,
            publishedAt: ca.article.publishedAt,
          })),
        };
      })
    );

    return NextResponse.json({
      items: enriched,
      nextCursor: hasMore ? String(items[items.length - 1]?.id) : null,
      refreshing: isStale,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
