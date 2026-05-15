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
