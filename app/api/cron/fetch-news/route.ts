import { NextResponse } from "next/server";
import { fetchAndProcessAllNews } from "@/lib/pipeline/fetch-all";
import { refreshMarketData } from "@/lib/market";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [newsResult] = await Promise.all([
      fetchAndProcessAllNews(),
      refreshMarketData(),
    ]);

    return NextResponse.json({
      success: true,
      articlesFetched: newsResult.articlesFetched,
      clustersCreated: newsResult.clustersCreated,
      errors: newsResult.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error), timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
