import { cn } from "@/lib/utils";
import type { RankingScope } from "./useRankingsExplorer";

const ALL_SCOPES: { id: RankingScope; label: string }[] = [
  { id: "world", label: "Mundial" },
  { id: "continental", label: "Continental" },
  { id: "national", label: "Nacional" },
  { id: "competition", label: "Competição" },
  { id: "club", label: "Clube" },
  { id: "season", label: "Época" },
];

interface Props {
  value: RankingScope;
  onChange: (scope: RankingScope) => void;
  /** Restrict which scopes are shown (players get all, others get world+season). */
  scopes?: RankingScope[];
}

export function RankingScopeTabs({ value, onChange, scopes }: Props) {
  const list = scopes ? ALL_SCOPES.filter((s) => scopes.includes(s.id)) : ALL_SCOPES;
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {list.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
