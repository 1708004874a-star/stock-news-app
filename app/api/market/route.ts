import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stocks = await prisma.stock.findMany({
      orderBy: { market: "asc" },
      select: {
        symbol: true,
        name: true,
        nameCn: true,
        market: true,
        price: true,
        changePct: true,
        updatedAt: true,
      },
    });

    const latestHeadlines = await Promise.all(
      stocks.map(async (s) => {
        const latestCluster = await prisma.newsCluster.findFirst({
          where: {
            articles: {
              some: { article: { stock: { symbol: s.symbol } } },
            },
          },
          orderBy: { publishedAt: "desc" },
          select: { title: true },
        });
        return { symbol: s.symbol, headline: latestCluster?.title || null };
      })
    );

    const headlinesMap = new Map(latestHeadlines.map((h) => [h.symbol, h.headline]));

    return NextResponse.json(
      stocks.map((s) => ({
        ...s,
        latestHeadline: headlinesMap.get(s.symbol) || null,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
