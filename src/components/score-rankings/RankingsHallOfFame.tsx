import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScoreEvaluationEntry, ScoreHistoryPoint } from "@/components/scores/types";

interface Props {
  /** Full ranking (career perspective aggregates over all rows). */
  ranking: ScoreEvaluationEntry[];
  /** Selected entity history (season perspective — placeholder-friendly). */
  history: ScoreHistoryPoint[];
}

type Perspective = "career" | "season";

interface HofCard {
  key: string;
  emoji: string;
  label: string;
  entityName: string | null;
  value: string;
  placeholder?: boolean;
}

export function RankingsHallOfFame({ ranking, history }: Props) {
  const [perspective, setPerspective] = useState<Perspective>("career");

  const cards = useMemo<HofCard[]>(() => {
    if (perspective === "career") {
      const best = ranking[0];
      const highestConf = [...ranking].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
      return [
        best
          ? c("best", "🏆", "Melhor de Sempre", best.entityName, best.score.toFixed(1))
          : ph("best", "🏆", "Melhor de Sempre"),
        highestConf
          ? c(
              "cons",
              "🎯",
              "Maior Consistência",
              highestConf.entityName,
              highestConf.confidence.toFixed(2),
            )
          : ph("cons", "🎯", "Maior Consistência"),
        ph("dom", "👑", "Maior Dominância"),
        ph("evo", "📈", "Maior Evolução"),
        ph("long", "⏳", "Maior Longevidade"),
        ph("young", "💎", "Melhor Jovem"),
        ph("vet", "⭐", "Melhor Veterano"),
        ph("rec", "🔄", "Maior Recuperação"),
        ph("dec", "📉", "Maior Queda"),
        ph("season-best", "🥇", "Melhor Época"),
      ];
    }
    // "season" perspective — from history of selected entity
    if (!history.length) {
      return [
        ph("season-best", "🥇", "Melhor Época"),
        ph("season-worst", "📉", "Pior Época"),
        ph("season-consistency", "🎯", "Maior Consistência"),
        ph("season-jump", "📈", "Maior Salto"),
      ];
    }
    const bestSeason = [...history].sort((a, b) => b.score - a.score)[0];
    const worstSeason = [...history].sort((a, b) => a.score - b.score)[0];
    return [
      c(
        "season-best",
        "🥇",
        "Melhor Época",
        String(bestSeason.season),
        bestSeason.score.toFixed(1),
      ),
      c(
        "season-worst",
        "📉",
        "Pior Época",
        String(worstSeason.season),
        worstSeason.score.toFixed(1),
      ),
      ph("season-consistency", "🎯", "Maior Consistência"),
      ph("season-jump", "📈", "Maior Salto"),
    ];
  }, [ranking, history, perspective]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Hall of Fame</CardTitle>
        <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5">
          {(["career", "season"] as Perspective[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerspective(p)}
              className={cn(
                "rounded px-2 py-1 text-xs",
                p === perspective ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {p === "career" ? "Carreira" : "Época"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.key}
              className={cn(
                "rounded-md border p-3",
                card.placeholder && "border-dashed bg-muted/20",
              )}
            >
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>{card.emoji}</span>
                <span className="truncate">{card.label}</span>
              </div>
              <div className="mt-1 truncate text-sm font-semibold" title={card.entityName ?? ""}>
                {card.entityName ?? "Em breve"}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{card.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function c(key: string, emoji: string, label: string, entityName: string, value: string): HofCard {
  return { key, emoji, label, entityName, value };
}
function ph(key: string, emoji: string, label: string): HofCard {
  return { key, emoji, label, entityName: null, value: "—", placeholder: true };
}
