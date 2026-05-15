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
