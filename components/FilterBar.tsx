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
