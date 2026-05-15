# Stock News Aggregation App — Design Spec

## Scope

A real, usable web app that aggregates and summarizes hot news for 13 stocks and 3 indices across A-shares, HK, and US markets. AI-powered summarization (Claude Haiku for cost efficiency), cross-source verification, and source links included. Deployed on Vercel with a free-tier data pipeline. Each news source failure degrades gracefully — the pipeline continues with whatever sources succeed.

### Tracked Symbols

| Market | Ticker | Name |
|--------|--------|------|
| US | AAPL | Apple |
| US | NVDA | NVIDIA |
| US | TSLA | Tesla |
| US | BRK.B | Berkshire Hathaway |
| US | MU | Micron Technology |
| US | INTC | Intel |
| US | ASML | ASML |
| US | TSM | Taiwan Semiconductor (TSMC) |
| US | PLTR | Palantir |
| CN | 600519.SS | 贵州茅台 (Kweichow Moutai) |
| CN | 000848.SZ | 承德露露 (Chengde Lolo) |
| HK | 0700.HK | 腾讯控股 (Tencent) |
| HK | 9992.HK | 泡泡玛特 (Pop Mart) |
| Index | ^GSPC | S&P 500 |
| Index | ^IXIC | NASDAQ |
| Index | 000300.SS | 沪深300 |

## Architecture

Next.js App Router (monolith) on Vercel. Vercel Cron Jobs trigger news fetching every 5 minutes. API Routes serve processed news and market data. Vercel Postgres for storage. ISR for page rendering.

```
Vercel Cron (5min) → /api/cron/fetch-news
                        ├── Fetch from Finnhub, Google News RSS, Yahoo Finance
                        ├── Deduplicate (Levenshtein similarity)
                        ├── Claude API summarize (batch)
                        ├── Cross-verify (source count)
                        └── Write to Postgres

Browser → Next.js ISR pages (revalidate 60s)
            ├── /                    (all news feed)
            └── /stock/[symbol]      (single stock news)

Browser → API Routes (on-demand)
            ├── /api/news            (news list with filters)
            └── /api/market          (live market snapshot)
```

## Data Sources

| Source | Coverage | Rate Limit | Content |
|--------|----------|------------|---------|
| Finnhub API | US stocks, limited HK | 60 req/min free | Company news, market data |
| Google News RSS | All markets | Unlimited | News articles, headlines |
| Yahoo Finance (unofficial) | US, HK, CN indices | Loose limit | News, quotes |
| Claude API | N/A | API key tier | Summarization |

Each source accessed through an adapter module (`lib/sources/*.ts`) that normalizes to a common `RawArticle` format.

## News Processing Pipeline

1. **Fetch**: Parallel fetch from all sources for all tracked symbols
2. **Normalize**: Convert each source format to `{title, snippet, url, source, publishedAt, stockId}`
3. **Deduplicate**: Group articles by title similarity (Levenshtein distance < threshold). Articles within 24h window and >0.7 title similarity → same cluster
4. **Summarize**: Each new cluster (or cluster with new articles) → Claude API batch call. Generate:
   - `aiSummary`: 1-2 sentence Chinese summary
   - `keyPoints`: Up to 3 bullet points (JSON array)
5. **Verify**: cluster with 2+ distinct source articles → `verified`, else → `unverified`
6. **Store**: Upsert cluster and article records

### AI Summarization Prompt (example)

```
You are a financial news editor. Summarize the following news headlines about {stockName} ({symbol}). 
Return JSON with:
- summary: 1-2 sentence Chinese summary of the key information
- keyPoints: up to 3 bullet points of the most important facts

Headlines:
{article_titles}
```

## Database Schema (Prisma + Vercel Postgres)

```
model Stock {
  id         Int       @id @default(autoincrement())
  symbol     String    @unique
  name       String
  nameCn     String
  market     Market    // US, HK, CN, INDEX
  price      Float?
  changePct  Float?
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
  source      Source    // finnhub, googlenews, yahoo
  publishedAt DateTime  @map("published_at")
  fetchedAt   DateTime  @default(now()) @map("fetched_at")

  stock       Stock            @relation(fields: [stockId], references: [id])
  clusters    ClusterArticle[]

  @@index([stockId])
  @@index([publishedAt])
}

model NewsCluster {
  id                  Int       @id @default(autoincrement())
  title               String
  aiSummary           String?   @map("ai_summary")
  keyPoints           Json?     @map("key_points")
  verificationStatus  String    @default("unverified") @map("verification_status") // verified | unverified
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

  cluster    NewsCluster @relation(fields: [clusterId], references: [id])
  article    Article     @relation(fields: [articleId], references: [id])

  @@id([clusterId, articleId])
}

enum Market   { US  HK  CN  INDEX }
enum Source   { finnhub  googlenews  yahoo }
```

## Frontend Pages

### Page 1: Home `/` — News Feed

**Top bar**: Horizontally scrollable ticker strip showing all 13 stocks + 3 indices with real-time price and change%. Green for up, red for down.

**Tabs**: "All News" | "Market Overview"

**All News tab**:
- Filter bar: market selector (All/US/HK/CN/Index) + "Verified only" toggle
- News card list (infinite scroll or paginated):
  - Verification badge: `✅ Verified (2 sources)` or `⏳ Unverified (1 source)`
  - Stock tag (e.g., `NVDA`)
  - AI summary (Chinese, 1-2 sentences)
  - Key points (up to 3 bullet points)
  - Source links (clickable, open in new tab)
  - Relative time ("3 min ago")

**Market Overview tab**:
- Table/grid of all tracked symbols showing: symbol, name, price, change%, latest news headline (if any)

### Page 2: `/stock/[symbol]` — Stock Detail

- Stock header: name, price, change%
- Filtered news feed for that stock only
- Same card format as homepage

### Design Tokens

- Dark theme: bg `#0a0a0a`, surface `#1a1a1a`, accent `#3b82f6`
- Font: system monospace for numbers, system sans for text
- No animations, no heavy graphics — fast and professional

## Implementation Plan (Summary)

1. **Scaffold Next.js project** with TypeScript, Tailwind, Prisma
2. **Database**: Set up Vercel Postgres, apply Prisma schema, seed stock list
3. **News source adapters**: Finnhub, Google News RSS, Yahoo Finance
4. **Processing pipeline**: Dedup, Claude summarization, cross-verification
5. **API Routes**: Cron trigger, news list, market data
6. **Frontend**: Ticker bar, news cards, filters, tabs, stock detail page
7. **Deploy to Vercel**: Cron jobs, env vars, domain

## Non-Goals (for this version)

- User accounts / auth
- Push notifications / email
- Historical charting
- Mobile app (web responsive only)
- Customizable watchlists
- Commenting / social features
