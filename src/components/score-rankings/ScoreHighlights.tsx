import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ScoreEvaluationEntry } from "@/components/scores/types";

interface Props {
  ranking: ScoreEvaluationEntry[];
}

interface Highlight {
  key: string;
  emoji: string;
  label: string;
  entityName: string | null;
  value: string;
}

/**
 * Pure derivations over the ranking list. No narrative, no engine calls.
 * Missing data collapses to placeholder cards.
 */
export function ScoreHighlights({ ranking }: Props) {
  const highlights = useMemo<Highlight[]>(() => {
    const sorted = ranking;
    const first = sorted[0];
    const second = sorted[1];
    const third = sorted[2];
    // "Revelação": highest confidence in top 20 (proxy without season delta).
    const top20 = sorted.slice(0, 20);
    const revelation = [...top20].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];

    const empty = (key: string, emoji: string, label: string): Highlight => ({
      key,
      emoji,
      label,
      entityName: null,
      value: "—",
    });

    return [
      first
        ? {
            key: "1st",
            emoji: "🏆",
            label: "Melhor do Mundo",
            entityName: first.entityName,
            value: first.score.toFixed(1),
          }
        : empty("1st", "🏆", "Melhor do Mundo"),
      second
        ? {
            key: "2nd",
            emoji: "🥈",
            label: "Segundo Melhor",
            entityName: second.entityName,
            value: second.score.toFixed(1),
          }
        : empty("2nd", "🥈", "Segundo Melhor"),
      third
        ? {
            key: "3rd",
            emoji: "🥉",
            label: "Terceiro Melhor",
            entityName: third.entityName,
            value: third.score.toFixed(1),
          }
        : empty("3rd", "🥉", "Terceiro Melhor"),
      revelation
        ? {
            key: "rev",
            emoji: "🔥",
            label: "Revelação",
            entityName: revelation.entityName,
            value: revelation.score.toFixed(1),
          }
        : empty("rev", "🔥", "Revelação"),
      empty("evo", "📈", "Maior Evolução"),
      empty("dec", "📉", "Maior Queda"),
      empty("young", "💎", "Melhor Jovem"),
      empty("vet", "⭐", "Melhor Veterano"),
    ];
  }, [ranking]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {highlights.map((h) => (
        <Card key={h.key} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span aria-hidden>{h.emoji}</span>
              <span className="truncate">{h.label}</span>
            </div>
            <div className="mt-1 truncate text-sm font-semibold" title={h.entityName ?? ""}>
              {h.entityName ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">{h.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
