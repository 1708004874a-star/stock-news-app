import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "全球股市热点追踪",
  description: "AI驱动的全球股市新闻聚合 — 追踪美股、港股、A股热点，实时更新",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
