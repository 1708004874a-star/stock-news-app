import { NextRequest, NextResponse } from "next/server";
import { fetchAndProcessNewsBatch } from "@/lib/pipeline/fetch-all";
import { refreshMarketData } from "@/lib/market";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchParam = request.nextUrl.searchParams.get("batch");
  const batch = batchParam ? parseInt(batchParam) : 0;

  try {
    const [newsResult] = await Promise.all([
      fetchAndProcessNewsBatch(batch),
      refreshMarketData(),
    ]);

    const nextBatch =
      batch < newsResult.batchesTotal - 1 ? batch + 1 : null;

    return NextResponse.json({
      success: true,
      batch,
      batchesTotal: newsResult.batchesTotal,
      nextBatch,
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
