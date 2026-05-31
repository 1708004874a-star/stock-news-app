@AGENTS.md

# Stock News App — 开发参考

## 项目概述

AI 驱动的全球股市新闻聚合器，面向中文投资者。追踪 16 只标的（9 美股 + 2 A 股 + 2 港股 + 3 指数），从三个来源并发抓取新闻，Jaccard 相似度去重，DeepSeek 生成中文摘要，部署在 Vercel Hobby 免费套餐。

**线上地址：** https://stock-news-app-ebon.vercel.app

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) + React 19 |
| 数据库 | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| 样式 | Tailwind CSS v4 |
| AI | DeepSeek API（`deepseek-chat`） |
| 部署 | Vercel Hobby（函数 10s 限制，每日 1 次 Cron） |

---

## 关键文件

| 文件 | 作用 |
|---|---|
| `lib/stocks.ts` | 自选股清单，改这里增删标的 |
| `lib/pipeline/fetch-all.ts` | 抓取→去重→AI 过滤→入库主流程 |
| `lib/pipeline/dedup.ts` | Jaccard 词袋标题相似度聚类（阈值 0.7） |
| `lib/pipeline/summarize.ts` | DeepSeek 相关性过滤 + 中文摘要，含指数退避重试 |
| `lib/sources/finnhub.ts` | Finnhub 公司新闻（近 2 天，最多 20 条） |
| `lib/sources/googlenews.ts` | Google News RSS；CN/HK 市场并发 en-US + zh-CN 双语查询 |
| `lib/sources/yahoo.ts` | Yahoo Finance v1 新闻搜索 |
| `lib/market.ts` | 实时报价：Finnhub → Yahoo v8 兜底 |
| `app/api/cron/fetch-news/route.ts` | Vercel Cron 入口，Bearer 鉴权，自动按 UTC 小时轮换批次 |
| `app/api/news/route.ts` | 新闻列表 API，含懒刷新（超 65 分钟触发） |
| `app/api/market/route.ts` | 自选股快照 API |
| `prisma/schema.prisma` | 数据库模型：Stock / Article / NewsCluster / ClusterArticle |
| `vercel.json` | Cron 配置（每日 UTC 0 点） |

---

## 数据流

```
Vercel Cron (每日 00:00 UTC) 或页面懒刷新
  ↓
/api/cron/fetch-news  (Bearer 鉴权)
  ↓
fetchAndProcessNewsBatch(batch)
  ├─ 并发：Finnhub + Google News (en + zh) + Yahoo Finance
  ├─ Jaccard 聚类去重
  ├─ DeepSeek 相关性过滤（所有市场）
  ├─ DeepSeek 中文摘要（所有市场）
  └─ 写入 PostgreSQL
  ↓
/api/news  →  NewsFeed 组件（每 5 分钟轮询）
/api/market →  MarketOverview + TickerStrip
```

---

## 重要约束（Vercel Hobby）

- **函数超时**：10 秒，Cron 函数 60 秒
- **Cron 频率**：每日最多一次，表达式必须为 `0 0 * * *` 形式，**不能用 `0 * * * *`（每小时）**，否则部署报错
- **数据库连接**：`pg pool max=1`，见 `lib/db.ts`
- **批次大小**：`BATCH_SIZE=2`，每次 Cron 处理 2 只股票，通过 `batch` 参数手动轮转

---

## 主要优化记录（2026-05-31）

### 新增功能
- **中英双语新闻**：`lib/sources/googlenews.ts` 对 CN/HK 市场并发发起 `zh-CN` 中文查询，结果按 URL 去重合并
- **AI 全市场覆盖**：移除 `fetch-all.ts` 中只对美股做 AI 过滤/摘要的限制，港股和 A 股现在也有中文摘要

### 稳定性
- **DeepSeek 重试**：`summarize.ts` 的 `callDeepSeek()` 加入指数退避重试（最多 3 次），429 和网络错误均会重试

### 性能
- **API 缓存**：`/api/news` 和 `/api/market` 响应头加 `Cache-Control: s-maxage=300, stale-while-revalidate=60`
- **前端轮询**：`NewsFeed.tsx` 轮询间隔从 60 秒延长至 5 分钟
- **懒刷新阈值**：`/api/news` 的 `STALE_MINUTES` 从 5 分钟改为 65 分钟，避免每次页面加载都触发刷新

### 清理
- **移除无用依赖**：`fast-levenshtein` 和 `@types/fast-levenshtein`（去重逻辑实际使用 Jaccard，该包从未被引用）

---

## 本地开发

```bash
cp .env.example .env.local   # 填入 DATABASE_URL / FINNHUB_API_KEY / DEEPSEEK_API_KEY / CRON_SECRET
npx prisma db push
npm run dev                  # http://localhost:3000
```

手动触发抓取：
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     "http://localhost:3000/api/cron/fetch-news?batch=0"
```

## 部署

```bash
npx vercel --prod
```

Vercel 未连接 GitHub 自动部署，每次更新需手动执行上述命令，或在 Vercel Dashboard → Settings → Git 里连接仓库实现 push 自动触发。
