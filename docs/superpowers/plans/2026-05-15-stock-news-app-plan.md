# Stock News Aggregation App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, usable stock news aggregation web app tracking 13 stocks and 3 indices across US, HK, and CN markets with AI summarization, cross-verification, and source links.

**Architecture:** Next.js 15 App Router monolith on Vercel. Vercel Cron Jobs fetch news every 5 minutes from Finnhub, Google News RSS, and Yahoo Finance. Claude Haiku summarizes. Vercel Postgres stores data. ISR renders pages every 60 seconds.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Prisma, Vercel Postgres, Anthropic SDK, Finnhub API, Google News RSS, Yahoo Finance (unofficial)

**Note:** Node.js is at `/opt/homebrew/bin/node` and npm at `/opt/homebrew/bin/npm`. Ensure these are in PATH or use full paths.

---

## File Structure

```
stock-news-app/
├── app/
│   ├── globals.css              # Tailwind + dark theme base styles
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Home: news feed + market overview tabs
│   └── api/
│       ├── cron/
│       │   └── fetch-news/
│       │       └── route.ts     # Cron endpoint: fetch, dedup, summarize, store
│       ├── news/
│       │   └── route.ts         # GET: paginated news clusters with filters
│       └── market/
│           └── route.ts         # GET: all stock prices snapshot
├── components/
│   ├── TickerStrip.tsx          # Horizontally scrollable price ticker
│   ├── NewsCard.tsx             # Single news cluster card
│   ├── MarketOverview.tsx       # Market overview table/grid
│   └── FilterBar.tsx            # Market filter + verified toggle
├── lib/
│   ├── db.ts                    # Prisma singleton
│   ├── stocks.ts                # Stock list data + constants
│   ├── sources/
│   │   ├── types.ts             # RawArticle interface
│   │   ├── finnhub.ts           # Finnhub API adapter
│   │   ├── googlenews.ts        # Google News RSS adapter
│   │   └── yahoo.ts             # Yahoo Finance adapter
│   ├── pipeline/
│   │   ├── dedup.ts             # Title similarity clustering
│   │   ├── summarize.ts         # Claude Haiku batch summarization
│   │   └── fetch-all.ts         # Orchestrator: fetch → pipeline → store
│   └── market.ts                # Market price fetching
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                  # Seed 16 stock records
├── .env.local                   # API keys & DB URL
├── vercel.json                  # Cron job config
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── .gitignore
```

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.gitignore`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/longyuhan/stock-news-app && \
PATH="/opt/homebrew/bin:$PATH" npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias="@/*" --no-turbopack --js=false
```

Expected: Scaffolded Next.js project with Tailwind.

- [ ] **Step 2: Install additional dependencies**

```bash
cd /Users/longyuhan/stock-news-app && \
PATH="/opt/homebrew/bin:$PATH" npm install prisma @prisma/client @anthropic-ai/sdk fast-levenshtein
PATH="/opt/homebrew/bin:$PATH" npm install -D @types/fast-levenshtein
```

Expected: Dependencies installed.

- [ ] **Step 3: Update .gitignore**

Read `.gitignore`, then edit to add `.env.local` if not present and `.superpowers/` line.

- [ ] **Step 4: Verify scaffold builds**

```bash
cd /Users/longyuhan/stock-news-app && PATH="/opt/homebrew/bin:$PATH" npm run build
```

Expected: Successful build.

- [ ] **Step 5: Commit scaffold**

```bash
cd /Users/longyuhan/stock-news-app && \
git add -A && \
git commit -m "feat: scaffold Next.js project with Tailwind and Prisma deps"
```

---

### Task 2: Database Schema (Prisma + Vercel Postgres)

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Stock {
  id         Int       @id @default(autoincrement())
  symbol     String    @unique
  name       String
  nameCn     String    @map("name_cn")
  market     Market
  price      Float?
  changePct  Float?    @map("change_pct")
  updatedAt  DateTime? @map("updated_at")

  articles   Article[]
  clusters   NewsCluster[]
}

model Article {
  id          Int       @id @default(autoincrement())
  stockId     Int       @map("stock_id")
  title       String
  snippet     String?
  url         String
  source      Source
  publishedAt DateTime  @map("published_at")
  fetchedAt   DateTime  @default(now()) @map("fetched_at")

  stock       Stock            @relation(fields: [stockId], references: [id], onDelete: Cascade)
  clusters    ClusterArticle[]

  @@index([stockId])
  @@index([publishedAt])
}

model NewsCluster {
  id                  Int       @id @default(autoincrement())
  title               String
  aiSummary           String?   @map("ai_summary")
  keyPoints           Json?     @map("key_points")
  verificationStatus  String    @default("unverified") @map("verification_status")
  sourceCount         Int       @default(1) @map("source_count")
  publishedAt         DateTime  @map("published_at")
  createdAt           DateTime  @default(now()) @map("created_at")

  articles   ClusterArticle[]

  @@index([publishedAt])
  @@index([verificationStatus])
}

model ClusterArticle {
  clusterId  Int @map("cluster_id")
  articleId  Int @map("article_id")

  cluster    NewsCluster @relation(fields: [clusterId], references: [id], onDelete: Cascade)
  article    Article     @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@id([clusterId, articleId])
}

enum Market {
  US
  HK
  CN
  INDEX
}

enum Source {
  finnhub
  googlenews
  yahoo
}
```

Write to `prisma/schema.prisma`.

- [ ] **Step 2: Generate Prisma client**

```bash
cd /Users/longyuhan/stock-news-app && PATH="/opt/homebrew/bin:$PATH" npx prisma generate
```

Expected: Client generated without errors.

- [ ] **Step 3: Create .env.local placeholder**

```env
DATABASE_URL="postgres://..."
FINNHUB_API_KEY="your-finnhub-key"
ANTHROPIC_API_KEY="your-anthropic-key"
CRON_SECRET="generate-a-random-secret-here"
```

Write to `.env.local`.

- [ ] **Step 4: Commit**

```bash
cd /Users/longyuhan/stock-news-app && \
git add prisma/schema.prisma .env.local && \
git commit -m "feat: add Prisma schema with Stock, Article, NewsCluster models"
```

---

### Task 3: Stock List Constants and Prisma Client Singleton

**Files:**
- Create: `lib/stocks.ts`, `lib/db.ts`

- [ ] **Step 1: Write stock list constants**

```typescript
export type MarketType = "US" | "HK" | "CN" | "INDEX";

export interface StockData {
  symbol: string;
  name: string;
  nameCn: string;
  market: MarketType;
}

export const TRACKED_STOCKS: StockData[] = [
  // US
  { symbol: "AAPL", name: "Apple", nameCn: "苹果", market: "US" },
  { symbol: "NVDA", name: "NVIDIA", nameCn: "英伟达", market: "US" },
  { symbol: "TSLA", name: "Tesla", nameCn: "特斯拉", market: "US" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", nameCn: "伯克希尔", market: "US" },
  { symbol: "MU", name: "Micron Technology", nameCn: "美光科技", market: "US" },
  { symbol: "INTC", name: "Intel", nameCn: "英特尔", market: "US" },
  { symbol: "ASML", name: "ASML", nameCn: "阿斯麦", market: "US" },
  { symbol: "TSM", name: "TSMC", nameCn: "台积电", market: "US" },
  { symbol: "PLTR", name: "Palantir", nameCn: "Palantir", market: "US" },
  // CN
  { symbol: "600519.SS", name: "Kweichow Moutai", nameCn: "贵州茅台", market: "CN" },
  { symbol: "000848.SZ", name: "Chengde Lolo", nameCn: "承德露露", market: "CN" },
  // HK
  { symbol: "0700.HK", name: "Tencent", nameCn: "腾讯控股", market: "HK" },
  { symbol: "9992.HK", name: "Pop Mart", nameCn: "泡泡玛特", market: "HK" },
  // Indices
  { symbol: "^GSPC", name: "S&P 500", nameCn: "标普500", market: "INDEX" },
  { symbol: "^IXIC", name: "NASDAQ", nameCn: "纳斯达克", market: "INDEX" },
  { symbol: "000300.SS", name: "CSI 300", nameCn: "沪深300", market: "INDEX" },
];
```

Write to `lib/stocks.ts`.

- [ ] **Step 2: Write Prisma client singleton**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Write to `lib/db.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/longyuhan/stock-news-app && \
git add lib/stocks.ts lib/db.ts && \
git commit -m "feat: add stock constants and Prisma client singleton"
```

---

### Task 4: News Source Adapter Interface

**Files:**
- Create: `lib/sources/types.ts`

- [ ] **Step 1: Write adapter interfaces**

```typescript
export type SourceType = "finnhub" | "googlenews" | "yahoo";

export interface RawArticle {
  title: string;
  snippet: string;
  url: string;
  source: SourceType;
  publishedAt: Date;
  stockId: number;
}

export interface FetchNewsParams {
  symbol: string;
  name: string;
  stockId: number;
}

export type NewsFetcher = (params: FetchNewsParams) => Promise<RawArticle[]>;
```

Write to `lib/sources/types.ts`.

- [ ] **Step 2: Commit**

```bash
cd /Users/longyuhan/stock-news-app && \
git add lib/sources/types.ts && \
git commit -m "feat: add news source adapter interfaces"
```

---

### Task 5: Finnhub News Adapter

**Files:**
- Create: `lib/sources/finnhub.ts`

- [ ] **Step 1: Write Finnhub adapter**

```typescript
import { RawArticle, NewsFetcher } from "./types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY!;

export const fetchFinnhubNews: NewsFetcher = async ({ symbol, stockId }) => {
  if (!API_KEY) return [];

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 2);
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = new Date().toISOString().split("T")[0];

    const res = await fetch(
      `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${API_KEY}`
    );

    if (!res.ok) return [];

    const data: FinnhubArticle[] = await res.json();

    return data.slice(0, 20).map((a) => ({
      title: a.headline,
      snippet: a.summary.slice(0, 300),
      url: a.url,
      source: "finnhub" as const,
      publishedAt: new Date(a.datetime * 1000),
      stockId,
    }));
  } catch {
    return [];
  }
};

interface FinnhubArticle {
  headline: string;
  summary: string;
  url: string;
  datetime: number;
}
```

Write to `lib/sources/finnhub.ts`.

- [ ] **Step 2: Commit**

---

### Task 6: Google News RSS Adapter

**Files:**
- Create: `lib/sources/googlenews.ts`

- [ ] **Step 1: Write Google News adapter**

```typescript
import { RawArticle, NewsFetcher } from "./types";

function buildSearchQuery(name: string, symbol: string): string {
  // Use company name + "stock" for better results
  const query = encodeURIComponent(`${name} stock`);
  return `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
}

export const fetchGoogleNews: NewsFetcher = async ({ name, symbol, stockId }) => {
  try {
    const url = buildSearchQuery(name, symbol);
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) return [];

    const text = await res.text();

    // Parse RSS XML — simple regex approach to avoid XML parser dependency
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
```

Write to `lib/sources/googlenews.ts`.

- [ ] **Step 2: Commit**

---

### Task 7: Yahoo Finance Adapter

**Files:**
- Create: `lib/sources/yahoo.ts`

- [ ] **Step 1: Write Yahoo Finance adapter**

```typescript
import { RawArticle, NewsFetcher } from "./types";

/**
 * Uses Yahoo Finance's unofficial quote and news endpoints.
 * No API key required but rate-limited.
 */
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
      snippet: (n.publisher || "") + " — " + n.title,
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
```

Write to `lib/sources/yahoo.ts`.

- [ ] **Step 2: Commit**

---

### Task 8: Deduplication Pipeline

**Files:**
- Create: `lib/pipeline/dedup.ts`

- [ ] **Step 1: Write deduplication logic**

```typescript
import { RawArticle } from "../sources/types";

export interface ArticleGroup {
  canonicalTitle: string;
  articles: RawArticle[];
  sourceTypes: Set<string>;
}

/**
 * Groups articles by title similarity using Levenshtein distance.
 * Articles within 24h window with >0.7 similarity are grouped together.
 */
export function groupSimilarArticles(allArticles: RawArticle[]): ArticleGroup[] {
  const groups: ArticleGroup[] = [];
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const article of allArticles) {
    // Skip articles older than 24h
    if (now - article.publishedAt.getTime() > oneDayMs) continue;

    let matched = false;

    for (const group of groups) {
      for (const existing of group.articles) {
        const similarity = titleSimilarity(article.title, existing.title);
        if (similarity > 0.7) {
          group.articles.push(article);
          group.sourceTypes.add(article.source);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      groups.push({
        canonicalTitle: article.title,
        articles: [article],
        sourceTypes: new Set([article.source]),
      });
    }
  }

  // Only keep groups with meaningful titles (at least 10 chars)
  return groups.filter((g) => g.canonicalTitle.length >= 10);
}

/**
 * Simple word-overlap similarity that's faster than Levenshtein.
 * Returns 0-1 score. Falls back to Levenshtein for very short titles.
 */
function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
```

Write to `lib/pipeline/dedup.ts`.

- [ ] **Step 2: Commit**

---

### Task 9: Claude Summarization Pipeline

**Files:**
- Create: `lib/pipeline/summarize.ts`

- [ ] **Step 1: Write summarization function**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export async function summarizeArticles(
  stockNameCn: string,
  symbol: string,
  titles: string[]
): Promise<SummaryResult | null> {
  if (!process.env.ANTHROPIC_API_KEY || titles.length === 0) return null;

  const titleList = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `You are a financial news editor. Summarize the following news headlines about ${stockNameCn} (${symbol}).
Return ONLY a JSON object with:
- summary: 1-2 sentence Chinese summary of the key information
- keyPoints: up to 3 bullet points of the most important facts (in Chinese)

Headlines:
${titleList}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { text: string }).text.trim();
    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
    };
  } catch {
    return null;
  }
}
```

Write to `lib/pipeline/summarize.ts`.

- [ ] **Step 2: Commit**

---

### Task 10: Fetch-All Orchestrator (Fetch → Pipeline → Store)

**Files:**
- Create: `lib/pipeline/fetch-all.ts`

- [ ] **Step 1: Write orchestrator**

```typescript
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
  
  // 1. Fetch all articles in parallel across all stocks
  const allRawArticles: RawArticle[] = [];

  for (const stock of TRACKED_STOCKS) {
    // First, ensure stock record exists
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
      fetchers.map((fn) => fn({ symbol: stock.symbol, name: stock.name, stockId: dbStock.id }))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allRawArticles.push(...result.value);
      } else {
        errors.push(`Fetch error for ${stock.symbol}: ${result.reason}`);
      }
    }
  }

  // 2. Deduplicate into groups
  const groups = groupSimilarArticles(allRawArticles);

  // 3. Store articles and create clusters
  let clustersCreated = 0;

  for (const group of groups) {
    if (group.articles.length === 0) continue;

    const primaryArticle = group.articles[0];
    const stockId = primaryArticle.stockId;

    // Check if an article with the same URL already exists
    const firstUrl = primaryArticle.url;
    const existing = await prisma.article.findFirst({
      where: { url: firstUrl },
    });
    if (existing) {
      // Skip this group — already processed
      continue;
    }

    // Insert all articles in the group
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

    // Get stock info for summarization
    const stock = TRACKED_STOCKS.find((s) => s.symbol === dbStockSymbol(stockId));
    const titles = group.articles.map((a) => a.title);

    // Summarize
    let aiSummary: string | null = null;
    let keyPoints: string[] = [];
    if (stock) {
      const result = await summarizeArticles(stock.nameCn, stock.symbol, titles);
      if (result) {
        aiSummary = result.summary;
        keyPoints = result.keyPoints;
      }
    }

    const verificationStatus =
      group.sourceTypes.size >= 2 ? "verified" : "unverified";

    // Create cluster
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

  // 4. Cleanup: delete articles older than 7 days and their clusters
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.newsCluster.deleteMany({ where: { publishedAt: { lt: sevenDaysAgo } } });
  await prisma.article.deleteMany({ where: { publishedAt: { lt: sevenDaysAgo } } });

  return {
    articlesFetched: allRawArticles.length,
    clustersCreated,
    errors,
  };
}

function dbStockSymbol(stockId: number): string {
  return TRACKED_STOCKS[stockId - 1]?.symbol ?? "";
}
```

Write to `lib/pipeline/fetch-all.ts`.

- [ ] **Step 2: Fix the dbStockSymbol helper**

The stockId from upsert will vary. Replace the helper function with a lookup map approach. Edit `fetch-all.ts` after writing to fix the symbol lookup: first find the stock by `prisma.stock.findUnique({ where: { id: stockId } })` in the loop.

Write this corrected version instead:

```typescript
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
      fetchers.map((fn) => fn({ symbol: stock.symbol, name: stock.name, stockId: dbStock.id }))
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

    // Lookup stock info for summarization
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
```

**Write this version to the file.** Then commit.

---

### Task 11: Market Data Fetching

**Files:**
- Create: `lib/market.ts`

- [ ] **Step 1: Write market data fetcher**

```typescript
import { prisma } from "./db";
import { TRACKED_STOCKS } from "./stocks";

/**
 * Fetches real-time prices for all tracked stocks from Yahoo Finance.
 * Updates the Stock records in the database.
 */
export async function refreshMarketData(): Promise<void> {
  const symbols = TRACKED_STOCKS.map((s) => s.symbol);

  try {
    const symbolsParam = symbols.join(",");
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!res.ok) return;

    const data: YahooQuoteResponse = await res.json();
    const results = data.quoteResponse?.result || [];

    for (const quote of results) {
      await prisma.stock.updateMany({
        where: { symbol: quote.symbol },
        data: {
          price: quote.regularMarketPrice ?? undefined,
          changePct: quote.regularMarketChangePercent ?? undefined,
          updatedAt: new Date(),
        },
      });
    }
  } catch {
    // Market data is non-critical — silently fail
  }
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuote[];
  };
}

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
}
```

Write to `lib/market.ts`.

- [ ] **Step 2: Commit**

---

### Task 12: Cron API Route

**Files:**
- Create: `app/api/cron/fetch-news/route.ts`

- [ ] **Step 1: Write cron route**

```typescript
import { NextResponse } from "next/server";
import { fetchAndProcessAllNews } from "@/lib/pipeline/fetch-all";
import { refreshMarketData } from "@/lib/market";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
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
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

Write to `app/api/cron/fetch-news/route.ts`.

- [ ] **Step 2: Commit**

---

### Task 13: News List API Route

**Files:**
- Create: `app/api/news/route.ts`

- [ ] **Step 1: Write news list route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get("market"); // US | HK | CN | INDEX
  const verifiedOnly = searchParams.get("verified") === "true";
  const cursor = searchParams.get("cursor"); // cursor-based pagination
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
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

    // Filter by stock market if specified
    const filtered = market
      ? await filterByMarket(clusters, market)
      : clusters;

    const hasMore = filtered.length > limit;
    const items = filtered.slice(0, limit);

    // Get stock info for each cluster (from the first article)
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
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

async function filterByMarket(
  clusters: Awaited<ReturnType<typeof prisma.newsCluster.findMany>>,
  market: string
) {
  // Get all stock IDs for the given market
  const stocks = await prisma.stock.findMany({
    where: { market: market as "US" | "HK" | "CN" | "INDEX" },
    select: { id: true },
  });
  const stockIds = new Set(stocks.map((s) => s.id));

  return clusters.filter((c) => {
    const stockId = c.articles[0]?.article.stockId;
    return stockId !== undefined && stockIds.has(stockId);
  });
}
```

Write to `app/api/news/route.ts`.

- [ ] **Step 2: Commit**

---

### Task 14: Market Data API Route

**Files:**
- Create: `app/api/market/route.ts`

- [ ] **Step 1: Write market data route**

```typescript
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

    // Get latest news headline per stock
    const latestHeadlines = await Promise.all(
      stocks.map(async (s) => {
        const latestCluster = await prisma.newsCluster.findFirst({
          where: {
            articles: {
              some: {
                article: { stock: { symbol: s.symbol } },
              },
            },
          },
          orderBy: { publishedAt: "desc" },
          select: { title: true },
        });
        return { symbol: s.symbol, headline: latestCluster?.title || null };
      })
    );

    const headlinesMap = new Map(
      latestHeadlines.map((h) => [h.symbol, h.headline])
    );

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
```

Write to `app/api/market/route.ts`.

- [ ] **Step 2: Commit**

---

### Task 15: Frontend Layout and Theme

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Write global styles**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0a0a;
  --color-surface: #1a1a1a;
  --color-surface-hover: #242424;
  --color-accent: #3b82f6;
  --color-up: #22c55e;
  --color-down: #ef4444;
  --color-border: #2a2a2a;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-badge-verified: #166534;
  --color-badge-unverified: #713f12;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
```

Write to `app/globals.css` (replace existing content).

- [ ] **Step 2: Write root layout**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "全球股市热点追踪",
  description: "AI驱动的全球股市新闻聚合 — 追踪美股、港股、A股热点，实时更新",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
```

Write to `app/layout.tsx` (replace existing content).

- [ ] **Step 3: Commit**

---

### Task 16: TickerStrip Component

**Files:**
- Create: `components/TickerStrip.tsx`

- [ ] **Step 1: Write TickerStrip component**

```tsx
"use client";

import { useEffect, useState } from "react";

interface StockSnapshot {
  symbol: string;
  nameCn: string;
  price: number | null;
  changePct: number | null;
}

export function TickerStrip() {
  const [stocks, setStocks] = useState<StockSnapshot[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/market");
        const data = await res.json();
        setStocks(data);
      } catch {}
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (stocks.length === 0) return null;

  return (
    <div className="border-b border-border bg-surface overflow-hidden">
      <div className="flex gap-0 overflow-x-auto px-4 py-2 scrollbar-hide">
        {stocks.map((s) => (
          <div
            key={s.symbol}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-default min-w-[120px]"
          >
            <div className="flex flex-col">
              <span className="text-xs text-text-secondary leading-none">
                {s.nameCn}
              </span>
              <span className="text-sm font-mono tabular-nums font-medium">
                {s.price != null ? s.price.toFixed(2) : "—"}
              </span>
            </div>
            {s.changePct != null && (
              <span
                className={`text-xs font-mono tabular-nums font-medium ${
                  s.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {s.changePct >= 0 ? "+" : ""}
                {s.changePct.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Write to `components/TickerStrip.tsx`.

- [ ] **Step 2: Commit**

---

### Task 17: NewsCard Component

**Files:**
- Create: `components/NewsCard.tsx`

- [ ] **Step 1: Write NewsCard component**

```tsx
import { formatDistanceToNow } from "./time-utils";

interface NewsCardProps {
  id: number;
  title: string;
  aiSummary: string | null;
  keyPoints: string[] | null;
  verificationStatus: "verified" | "unverified";
  sourceCount: number;
  publishedAt: string;
  stock: {
    symbol: string;
    nameCn: string;
    market: string;
  } | null;
  sources: {
    title: string;
    url: string;
    source: string;
  }[];
}

export function NewsCard({
  title,
  aiSummary,
  keyPoints,
  verificationStatus,
  sourceCount,
  publishedAt,
  stock,
  sources,
}: NewsCardProps) {
  const isVerified = verificationStatus === "verified";
  const timeAgo = formatDistanceToNow(new Date(publishedAt));

  return (
    <article className="bg-surface rounded-lg border border-border p-4 hover:border-accent/30 transition-colors">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {stock && (
          <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent font-medium">
            {stock.symbol}
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            isVerified
              ? "bg-badge-verified/30 text-up"
              : "bg-badge-unverified/30 text-yellow-400"
          }`}
        >
          {isVerified ? `已核验 (${sourceCount}源)` : `待验证 (${sourceCount}源)`}
        </span>
        <span className="text-xs text-text-secondary ml-auto">{timeAgo}</span>
      </div>

      <h3 className="text-sm font-medium mb-2 leading-relaxed">{title}</h3>

      {aiSummary && (
        <p className="text-sm text-text-secondary mb-3 leading-relaxed">
          {aiSummary}
        </p>
      )}

      {keyPoints && keyPoints.length > 0 && (
        <ul className="mb-3 space-y-1">
          {keyPoints.map((kp, i) => (
            <li key={i} className="text-xs text-text-secondary flex gap-1.5">
              <span className="text-accent mt-0.5">•</span>
              {kp}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs text-text-secondary">
        <span className="shrink-0">来源：</span>
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline truncate max-w-[200px]"
          >
            {sourceLabel(s.source)}
          </a>
        ))}
      </div>
    </article>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case "finnhub": return "Finnhub";
    case "googlenews": return "Google News";
    case "yahoo": return "Yahoo Finance";
    default: return source;
  }
}
```

Write to `components/NewsCard.tsx`.

- [ ] **Step 2: Create time utility**

```typescript
export function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return "刚刚";

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
```

Write to `components/time-utils.ts`.

- [ ] **Step 3: Commit**

---

### Task 18: FilterBar Component

**Files:**
- Create: `components/FilterBar.tsx`

- [ ] **Step 1: Write FilterBar component**

```tsx
"use client";

export type MarketFilter = "ALL" | "US" | "HK" | "CN" | "INDEX";

interface FilterBarProps {
  selected: MarketFilter;
  onSelect: (f: MarketFilter) => void;
  verifiedOnly: boolean;
  onVerifiedToggle: (v: boolean) => void;
}

const MARKETS: { value: MarketFilter; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "US", label: "美股" },
  { value: "HK", label: "港股" },
  { value: "CN", label: "A股" },
  { value: "INDEX", label: "指数" },
];

export function FilterBar({
  selected,
  onSelect,
  verifiedOnly,
  onVerifiedToggle,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
        {MARKETS.map((m) => (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selected === m.value
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => onVerifiedToggle(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-border bg-surface accent-accent"
        />
        仅看已核验
      </label>
    </div>
  );
}
```

Write to `components/FilterBar.tsx`.

- [ ] **Step 2: Commit**

---

### Task 19: Home Page — News Feed Tab

**Files:**
- Create: `app/page.tsx` (replace)
- Create: `components/NewsFeed.tsx`

- [ ] **Step 1: Write NewsFeed client component**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsCard } from "./NewsCard";
import { FilterBar, MarketFilter } from "./FilterBar";

interface NewsItem {
  id: number;
  title: string;
  aiSummary: string | null;
  keyPoints: string[] | null;
  verificationStatus: "verified" | "unverified";
  sourceCount: number;
  publishedAt: string;
  stock: { symbol: string; nameCn: string; market: string } | null;
  sources: { title: string; url: string; source: string }[];
}

export function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [market, setMarket] = useState<MarketFilter>("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (market !== "ALL") params.set("market", market);
      if (verifiedOnly) params.set("verified", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [market, verifiedOnly]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div>
      <FilterBar
        selected={market}
        onSelect={setMarket}
        verifiedOnly={verifiedOnly}
        onVerifiedToggle={setVerifiedOnly}
      />
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary text-sm">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-secondary text-sm">
          暂无新闻
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <NewsCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
```

Write to `components/NewsFeed.tsx`.

- [ ] **Step 2: Write MarketOverview client component**

```tsx
"use client";

import { useEffect, useState } from "react";

interface StockSnapshot {
  symbol: string;
  name: string;
  nameCn: string;
  market: string;
  price: number | null;
  changePct: number | null;
  latestHeadline: string | null;
}

export function MarketOverview() {
  const [stocks, setStocks] = useState<StockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market");
        const data = await res.json();
        setStocks(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-text-secondary text-sm">加载中...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-secondary text-xs">
            <th className="text-left py-2 px-3 font-medium">标的</th>
            <th className="text-left py-2 px-3 font-medium">市场</th>
            <th className="text-right py-2 px-3 font-medium">价格</th>
            <th className="text-right py-2 px-3 font-medium">涨跌幅</th>
            <th className="text-left py-2 px-3 font-medium">最新新闻</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr key={s.symbol} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
              <td className="py-2.5 px-3">
                <span className="font-medium">{s.nameCn}</span>
                <span className="text-text-secondary text-xs ml-1.5">{s.symbol}</span>
              </td>
              <td className="py-2.5 px-3 text-text-secondary text-xs">
                {marketLabel(s.market)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                {s.price != null ? s.price.toFixed(2) : "—"}
              </td>
              <td className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                s.changePct != null
                  ? s.changePct >= 0 ? "text-up" : "text-down"
                  : "text-text-secondary"
              }`}>
                {s.changePct != null
                  ? `${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(2)}%`
                  : "—"}
              </td>
              <td className="py-2.5 px-3 text-xs text-text-secondary max-w-[250px] truncate">
                {s.latestHeadline || "暂无"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function marketLabel(market: string): string {
  switch (market) {
    case "US": return "美股";
    case "HK": return "港股";
    case "CN": return "A股";
    case "INDEX": return "指数";
    default: return market;
  }
}
```

Write to `components/MarketOverview.tsx`.

- [ ] **Step 3: Write home page**

```tsx
"use client";

import { useState } from "react";
import { TickerStrip } from "@/components/TickerStrip";
import { NewsFeed } from "@/components/NewsFeed";
import { MarketOverview } from "@/components/MarketOverview";

type Tab = "news" | "overview";

export default function Home() {
  const [tab, setTab] = useState<Tab>("news");

  return (
    <div className="max-w-3xl mx-auto min-h-screen">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold tracking-tight">
          全球股市热点追踪
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          AI 驱动的全球股市新闻聚合 — 追踪美股、港股、A股热点
        </p>
      </header>

      <TickerStrip />

      <div className="px-4 py-3">
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border w-fit mb-4">
          <button
            onClick={() => setTab("news")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "news"
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            全部新闻
          </button>
          <button
            onClick={() => setTab("overview")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "overview"
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            自选概览
          </button>
        </div>

        {tab === "news" ? <NewsFeed /> : <MarketOverview />}
      </div>

      <footer className="text-center text-xs text-text-secondary py-8">
        数据来源：Finnhub / Google News / Yahoo Finance · AI摘要：Claude
      </footer>
    </div>
  );
}
```

Write to `app/page.tsx` (replace existing content).

- [ ] **Step 4: Remove the stock detail page from scope**

The spec mentions `/stock/[symbol]` as a nice-to-have. For the initial implementation, focus on the home page with both tabs. The stock detail page is a follow-up.

- [ ] **Step 5: Commit**

---

### Task 20: Vercel Configuration

**Files:**
- Create: `vercel.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Write vercel.json with cron config**

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-news",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Write to `vercel.json`.

- [ ] **Step 2: Update next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
```

Read `next.config.ts` first, then write this update.

- [ ] **Step 3: Commit**

---

### Task 21: Final Assembly and Verification

- [ ] **Step 1: Build the project**

```bash
cd /Users/longyuhan/stock-news-app && PATH="/opt/homebrew/bin:$PATH" npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 2: Verify all files exist**

```bash
cd /Users/longyuhan/stock-news-app && \
ls -la app/page.tsx app/layout.tsx app/globals.css \
  app/api/cron/fetch-news/route.ts app/api/news/route.ts app/api/market/route.ts \
  components/TickerStrip.tsx components/NewsCard.tsx components/NewsFeed.tsx \
  components/MarketOverview.tsx components/FilterBar.tsx components/time-utils.ts \
  lib/db.ts lib/stocks.ts lib/market.ts \
  lib/sources/types.ts lib/sources/finnhub.ts lib/sources/googlenews.ts lib/sources/yahoo.ts \
  lib/pipeline/dedup.ts lib/pipeline/summarize.ts lib/pipeline/fetch-all.ts \
  prisma/schema.prisma vercel.json .env.local
```

Expected: All files present.

- [ ] **Step 3: Commit**

---

### Task 22: Deploy to Vercel

- [ ] **Step 1: Ensure Vercel CLI is installed**

```bash
PATH="/opt/homebrew/bin:$PATH" npm install -g vercel
```

- [ ] **Step 2: Link and deploy**

```bash
cd /Users/longyuhan/stock-news-app && PATH="/opt/homebrew/bin:$PATH" vercel --prod
```

Follow the prompts to link the project and deploy.

- [ ] **Step 3: Set environment variables in Vercel dashboard**

After deploy, add these env vars in Vercel project settings:
- `DATABASE_URL` — Vercel Postgres connection string
- `FINNHUB_API_KEY` — Finnhub free tier API key
- `ANTHROPIC_API_KEY` — Anthropic API key
- `CRON_SECRET` — A random string for cron auth

**Post-deploy setup:**
1. Create a Vercel Postgres database from the Vercel dashboard (Storage tab)
2. Connect it to the project (auto-sets `DATABASE_URL`)
3. Run database migration: `npx prisma db push` (via Vercel CLI or local with DATABASE_URL set to Vercel Postgres)

- [ ] **Step 4: Verify deployment**

Open the deployed URL. The ticker at the top should show stock prices. The news feed will populate after the first cron trigger runs (within 5 minutes). Manually trigger the cron endpoint once to seed initial data:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/fetch-news
```

---

### Task 23: Register API Keys

Before the app can function, the user needs:

- [ ] **Step 1: Get Finnhub API key**

Go to https://finnhub.io/register — free tier, instant

- [ ] **Step 2: Get Anthropic API key**

Go to https://console.anthropic.com/ — requires account

- [ ] **Step 3: Set up Vercel Postgres**

In Vercel dashboard → Storage → Create Database → Postgres
Connects automatically to project.
