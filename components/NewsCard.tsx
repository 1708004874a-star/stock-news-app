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
          {isVerified
            ? `已核验 (${sourceCount}源)`
            : `待验证 (${sourceCount}源)`}
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
    case "finnhub":
      return "Finnhub";
    case "googlenews":
      return "Google News";
    case "yahoo":
      return "Yahoo Finance";
    default:
      return source;
  }
}
