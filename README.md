<div align="center">

# 📈 Stock News App

**AI 驱动的全球股市新闻聚合 · AI-powered global stock news aggregator**

追踪美股、港股、A 股热点 — 多源抓取（含中文新闻）、相似度去重、DeepSeek 中文摘要、Vercel Cron 每小时更新

Tracks US, Hong Kong, and A-share markets — multi-source fetching (incl. Chinese-language news), similarity dedup, DeepSeek Chinese summaries, hourly Vercel Cron refresh

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

**📖 语言 / Language:** [简体中文](#-简体中文) · [English](#-english)

</div>

---

<a id="-简体中文"></a>

## 🇨🇳 简体中文

> [跳转到 English ↓](#-english)

### ✨ 项目简介

**Stock News App** 是一个全球股市新闻聚合与摘要应用，专门针对中文读者优化。它会自动从多个新闻源抓取自选股相关新闻，按标题相似度聚类去重，并调用 DeepSeek 生成简短的中文要点摘要。整个系统部署在 Vercel + Vercel Postgres 的免费层，靠 Vercel Cron 自动维护数据新鲜度。

设计目标很简单：**让一个普通投资者在 30 秒之内，对自己持仓里发生了什么有一个准确、可核验、不被市场情绪带偏的认知。**

### 🎯 核心特性

- **🌍 多市场覆盖** — 美股（AAPL/NVDA/TSLA/BRK.B/MU/INTC/ASML/TSM/PLTR）、A 股（茅台 / 承德露露）、港股（腾讯 / 泡泡玛特），以及 S&P 500 / 纳斯达克 / 沪深 300 指数。
- **📰 三源抓取** — 同时从 Finnhub、Google News RSS、Yahoo Finance 抓取，最大化覆盖率与可核验性。
- **🌐 中英双语新闻** — 港股 / A 股同时发起英文和中文（`zh-CN`）Google News 查询，补齐境内中文报道，结果自动去重合并。
- **🔗 多源核验** — 同一新闻被两个及以上独立源报道时标记为 ✅ 已核验，只看主流信息可一键过滤。
- **🤖 AI 相关性过滤** — 对所有市场新闻调用 DeepSeek 剔除"标题撞名"、纯市场杂谈、行业泛文，保证页面上的每条都真正与自选股相关。
- **🧠 AI 中文摘要** — DeepSeek 为所有市场（美股 / 港股 / A 股）生成 1–2 句中文要点摘要，附带关键事实清单。
- **🔄 智能刷新** — 每天 UTC 0 点由 Vercel Cron 全量刷新；用户访问时若数据超过 65 分钟未更新，页面加载会自动触发懒刷新兜底。
- **📊 自选股概览** — 实时价格、当日涨跌幅、最新头条，一屏看完。
- **🌙 暗色优先 UI** — Tailwind v4，移动端友好。

### 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│  浏览器 (Next.js App Router · React 19 · Tailwind v4)       │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
       /api/news │              /api/market │  /api/cron/fetch-news
               │                      │           （Vercel Cron 触发）
┌──────────────▼──────────────────────▼───────────────────────┐
│              Pipeline 层 (lib/pipeline/*)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  fetch-all   │→ │    dedup     │→ │  summarize       │   │
│  │  三源并发抓取 │  │ 标题相似度聚类 │  │ DeepSeek 摘要+过滤 │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│   Prisma 7 + PostgreSQL (Vercel Postgres / Neon)            │
│   Stock · Article · NewsCluster · ClusterArticle            │
└──────────────────────────────────────────────────────────────┘
       ▲                  ▲                  ▲
       │                  │                  │
   Finnhub API    Google News RSS        Yahoo Finance v1/v8
                  (en-US + zh-CN)
```

**关键文件夹**

| 路径 | 作用 |
|------|------|
| `app/`                       | Next.js App Router 页面 + API 路由 |
| `app/api/news/route.ts`       | 新闻列表 API（含懒刷新） |
| `app/api/market/route.ts`     | 自选股快照 API |
| `app/api/cron/fetch-news/`    | Vercel Cron 入口（Bearer 鉴权） |
| `lib/sources/`                | 三个数据源适配器（finnhub / googlenews / yahoo） |
| `lib/pipeline/fetch-all.ts`   | 抓取-聚类-入库主流程 |
| `lib/pipeline/dedup.ts`       | 基于 Jaccard 词袋的标题相似度去重 |
| `lib/pipeline/summarize.ts`   | DeepSeek 相关性过滤 + 中文摘要 |
| `lib/market.ts`               | Finnhub → Yahoo v8 兜底的实时价格 |
| `lib/stocks.ts`               | 自选股清单（在这里改） |
| `components/`                 | NewsCard / NewsFeed / TickerStrip / MarketOverview / FilterBar |
| `prisma/schema.prisma`        | 数据库模型 |

### 🚀 快速开始

#### 1. 克隆并安装依赖

```bash
git clone https://github.com/1708004874a-star/stock-news-app.git
cd stock-news-app
npm install
```

#### 2. 配置环境变量

复制环境变量模板并填入你自己的值：

```bash
cp .env.example .env.local
```

打开 `.env.local`，填好以下四个变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL`      | ✅ | Postgres 连接串，本地可用 Docker / 远程 Neon / Vercel Postgres |
| `FINNHUB_API_KEY`   | ✅ | [Finnhub 免费 key](https://finnhub.io/register)，60 req/min |
| `DEEPSEEK_API_KEY`  | ⚠️ | [DeepSeek key](https://platform.deepseek.com/)，缺省时跳过 AI 摘要 |
| `CRON_SECRET`       | ✅ | 任意随机字符串，保护 cron 端点 |

> ⚠️ **不要把 `.env.local` 提交到 git** — 已通过 `.gitignore` 屏蔽。

#### 3. 初始化数据库

```bash
npx prisma db push
```

这会把 `prisma/schema.prisma` 里的表结构推送到你的 Postgres 实例。

#### 4. 本地运行

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。第一次打开会触发一次懒抓取，几秒后页面上会出现新闻。

#### 5. 手动触发一次全量抓取（可选）

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     "http://localhost:3000/api/cron/fetch-news?batch=0"
```

`batch` 参数循环 0…N-1 可以遍历所有自选股（单次 Vercel 函数 10 秒上限内只跑一小批）。

### ☁️ 部署到 Vercel

1. 在 [Vercel](https://vercel.com/new) 导入这个仓库。
2. 在项目 **Settings → Environment Variables** 里加入 `DATABASE_URL` / `FINNHUB_API_KEY` / `DEEPSEEK_API_KEY` / `CRON_SECRET`（三个环境都加）。
3. 给项目挂上 **Vercel Postgres** 或 **Neon**，会自动注入 `DATABASE_URL`。
4. 部署。`vercel.json` 已定义每日 UTC 0 点触发的 cron：

   ```json
   {
     "crons": [
       { "path": "/api/cron/fetch-news", "schedule": "0 0 * * *" }
     ]
   }
   ```

   Vercel Cron 会自动以 `Authorization: Bearer $CRON_SECRET` 调用该端点。

> 💡 **白嫖小贴士**：Vercel Hobby 限制每日只能有一次 Cron 触发、`pg` 连接数上限为 1、函数执行时长 10 秒。本项目默认 `BATCH_SIZE=2`、`pg pool max=1`，并在用户访问时通过懒刷新（超过 65 分钟未更新自动补刷）弥补单次 Cron 的覆盖不足。API 响应已加 `Cache-Control: s-maxage=300` 降低数据库压力。如需更高频率的 Cron，升级至 Pro 套餐即可。

### 📝 自定义自选股

编辑 `lib/stocks.ts`：

```ts
export const TRACKED_STOCKS: StockData[] = [
  { symbol: "AAPL", name: "Apple", nameCn: "苹果", market: "US" },
  // 👇 加你自己的
  { symbol: "META", name: "Meta", nameCn: "Meta", market: "US" },
  { symbol: "0388.HK", name: "HKEX", nameCn: "香港交易所", market: "HK" },
];
```

- `symbol` 用各源能识别的格式：A 股 `xxxxxx.SS` / `xxxxxx.SZ`，港股 `xxxx.HK`，指数 `^GSPC` / `^IXIC` 等。
- 改完保存即可，下次 cron / 懒刷新会自动建表更新。

### 🔐 关于安全

- `.env.local`、`.env.vercel`、`.vercel/` 全部已被 `.gitignore` 排除，不会进入仓库。
- 代码里所有 API key 都从 `process.env` 读取，没有任何硬编码。
- cron 端点强制要求 `Authorization: Bearer $CRON_SECRET`，任何匿名请求返回 401。
- 如果你曾经把真实 key 泄露过 — **立刻去对应控制台 revoke 并重新生成**，仅靠 `git rm` 在历史里去掉是不够的。

### 🛣️ Roadmap

- [ ] 用户自选股（账号体系 + 个人 watchlist）
- [ ] 推送通知（Telegram / 飞书 webhook）
- [ ] 情绪打分 + 历史趋势图
- [ ] 更多数据源（彭博 / 路透 / 财联社）
- [ ] 多语言摘要（en / zh-TW）

### 📜 许可证

MIT — 详见 `LICENSE`。

### 🙏 致谢

- [Finnhub](https://finnhub.io/) — 公司新闻 + 实时行情
- [Google News RSS](https://news.google.com/) — 通用新闻
- [Yahoo Finance](https://finance.yahoo.com/) — 行情兜底
- [DeepSeek](https://platform.deepseek.com/) — 高性价比的中文摘要 LLM
- [Vercel](https://vercel.com/) — 部署 / Postgres / Cron 一站式

---

<a id="-english"></a>

## 🇬🇧 English

> [回到中文 ↑](#-简体中文)

### ✨ Overview

**Stock News App** is a global-market news aggregator and summarizer, optimized for Chinese-speaking readers. It pulls news for a curated watchlist from multiple sources, clusters near-duplicate stories by title similarity, and uses DeepSeek to produce concise Chinese-language summaries with bullet-point facts. The whole stack runs on Vercel + Vercel Postgres free tier, kept fresh by Vercel Cron.

The product goal is simple: **let a regular retail investor understand, in under 30 seconds, what's actually happening in their portfolio — accurately, with cross-source verification, and without market-sentiment noise.**

### 🎯 Features

- **🌍 Multi-market coverage** — US (AAPL/NVDA/TSLA/BRK.B/MU/INTC/ASML/TSM/PLTR), A-share (Moutai, Chengde Lolo), HK (Tencent, Pop Mart), plus S&P 500 / NASDAQ / CSI 300 indices.
- **📰 Three-source fetching** — Finnhub, Google News RSS, and Yahoo Finance run in parallel for max coverage and cross-verification.
- **🌐 Bilingual news for CN/HK** — Google News is queried in both English and Chinese (`zh-CN`) for Hong Kong and A-share stocks, surfacing domestic Chinese-language coverage that English-only queries miss. Results are URL-deduplicated before processing.
- **🔗 Cross-source verification** — Stories reported by two or more independent sources get a ✅ Verified badge; a single-tap filter narrows the feed to verified only.
- **🤖 AI relevance filter** — DeepSeek removes ticker-collision noise, generic market chatter, and off-topic industry articles for all markets (US, HK, CN) before they hit your feed.
- **🧠 AI Chinese summaries** — DeepSeek produces a 1–2 sentence Chinese summary plus key bullet points for every market, not just US stocks.
- **🔄 Smart refresh** — A Vercel Cron runs a full refresh daily at 00:00 UTC. A lazy refresh also fires on page load if data is older than 65 minutes, ensuring freshness between cron windows.
- **📊 Watchlist snapshot** — Live price, day change %, and latest headline at a glance.
- **🌙 Dark-first UI** — Tailwind v4, mobile-friendly.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router · React 19 · Tailwind v4)      │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
       /api/news │              /api/market │  /api/cron/fetch-news
               │                      │           (triggered by Vercel Cron)
┌──────────────▼──────────────────────▼───────────────────────┐
│                Pipeline layer (lib/pipeline/*)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  fetch-all   │→ │    dedup     │→ │  summarize       │   │
│  │ parallel pull│  │ title-jaccard│  │ DeepSeek filter+ │   │
│  │ 3 sources    │  │ clustering   │  │ Chinese summary  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│   Prisma 7 + PostgreSQL (Vercel Postgres / Neon)            │
│   Stock · Article · NewsCluster · ClusterArticle            │
└──────────────────────────────────────────────────────────────┘
       ▲                  ▲                  ▲
       │                  │                  │
   Finnhub API    Google News RSS        Yahoo Finance v1/v8
                  (en-US + zh-CN)
```

**Key directories**

| Path | Purpose |
|------|---------|
| `app/`                       | Next.js App Router pages + API routes |
| `app/api/news/route.ts`       | News list API (with lazy refresh) |
| `app/api/market/route.ts`     | Watchlist snapshot API |
| `app/api/cron/fetch-news/`    | Vercel Cron entry (Bearer auth) |
| `lib/sources/`                | Source adapters (finnhub / googlenews / yahoo) |
| `lib/pipeline/fetch-all.ts`   | Fetch → cluster → persist orchestration |
| `lib/pipeline/dedup.ts`       | Bag-of-words Jaccard title similarity |
| `lib/pipeline/summarize.ts`   | DeepSeek relevance filter + Chinese summary |
| `lib/market.ts`               | Real-time price (Finnhub with Yahoo v8 fallback) |
| `lib/stocks.ts`               | Watchlist definition (edit here) |
| `components/`                 | NewsCard / NewsFeed / TickerStrip / MarketOverview / FilterBar |
| `prisma/schema.prisma`        | Database models |

### 🚀 Getting Started

#### 1. Clone & install

```bash
git clone https://github.com/1708004874a-star/stock-news-app.git
cd stock-news-app
npm install
```

#### 2. Configure environment

Copy the template and fill in your own values:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the four variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL`      | ✅ | Postgres connection string. Local Docker, Neon, or Vercel Postgres all work. |
| `FINNHUB_API_KEY`   | ✅ | Free key from [Finnhub](https://finnhub.io/register) — 60 req/min. |
| `DEEPSEEK_API_KEY`  | ⚠️ | Key from [DeepSeek](https://platform.deepseek.com/); AI summaries are skipped if absent. |
| `CRON_SECRET`       | ✅ | Any random string; protects the cron endpoint. |

> ⚠️ **Never commit `.env.local`** — it's already in `.gitignore`.

#### 3. Initialize the database

```bash
npx prisma db push
```

This pushes `prisma/schema.prisma` to your Postgres instance.

#### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first hit triggers a lazy fetch — news will appear after a few seconds.

#### 5. Trigger a manual full refresh (optional)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     "http://localhost:3000/api/cron/fetch-news?batch=0"
```

Loop `batch` from 0 to N-1 to cover the full watchlist (small batches keep each call under Vercel's 10s function limit).

### ☁️ Deploy to Vercel

1. Import the repo from [Vercel](https://vercel.com/new).
2. Under **Settings → Environment Variables**, add `DATABASE_URL`, `FINNHUB_API_KEY`, `DEEPSEEK_API_KEY`, and `CRON_SECRET` for all three environments.
3. Attach **Vercel Postgres** or **Neon** — `DATABASE_URL` gets injected automatically.
4. Deploy. `vercel.json` defines a daily cron at 00:00 UTC:

   ```json
   {
     "crons": [
       { "path": "/api/cron/fetch-news", "schedule": "0 0 * * *" }
     ]
   }
   ```

   Vercel Cron calls the endpoint with `Authorization: Bearer $CRON_SECRET`.

> 💡 **Free-tier tips**: Vercel Hobby allows only one cron trigger per day and caps `pg` connections at 1 and function duration at 10s. The repo defaults to `BATCH_SIZE=2`, `pg pool max=1`. A 65-minute lazy-refresh fallback fires on page load to supplement the daily cron. API responses carry `Cache-Control: s-maxage=300` to reduce database load. Upgrade to Pro to unlock higher-frequency cron schedules.

### 📝 Customizing the watchlist

Edit `lib/stocks.ts`:

```ts
export const TRACKED_STOCKS: StockData[] = [
  { symbol: "AAPL", name: "Apple", nameCn: "苹果", market: "US" },
  // 👇 add your own
  { symbol: "META", name: "Meta", nameCn: "Meta", market: "US" },
  { symbol: "0388.HK", name: "HKEX", nameCn: "香港交易所", market: "HK" },
];
```

- `symbol` follows source conventions: A-shares `xxxxxx.SS` / `xxxxxx.SZ`, HK `xxxx.HK`, indices `^GSPC` / `^IXIC`, etc.
- Save the file — the next cron or lazy refresh will upsert the row automatically.

### 🔐 Security notes

- `.env.local`, `.env.vercel`, and `.vercel/` are all gitignored and never enter the repository.
- Every API key is read from `process.env` — no hardcoded secrets anywhere in the source.
- The cron endpoint requires `Authorization: Bearer $CRON_SECRET`; anonymous requests get a 401.
- If you ever leak a real key — **revoke it in the provider's console and rotate immediately**. Removing it from git history is not enough.

### 🛣️ Roadmap

- [ ] User accounts + per-user watchlist
- [ ] Push notifications (Telegram / Feishu webhook)
- [ ] Sentiment scoring + historical trend chart
- [ ] More sources (Bloomberg / Reuters / Cailian)
- [ ] Multi-language summaries (en / zh-TW)

### 📜 License

MIT — see `LICENSE`.

### 🙏 Acknowledgements

- [Finnhub](https://finnhub.io/) — company news + real-time quotes
- [Google News RSS](https://news.google.com/) — broad news coverage
- [Yahoo Finance](https://finance.yahoo.com/) — quote fallback
- [DeepSeek](https://platform.deepseek.com/) — cost-effective Chinese-summary LLM
- [Vercel](https://vercel.com/) — hosting / Postgres / Cron, all in one

---

<div align="center">

Made with ☕ and 🤖 — issues & PRs welcome

</div>
