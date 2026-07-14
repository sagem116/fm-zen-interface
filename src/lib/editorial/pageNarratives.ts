import type { ScoreDefinition, ScoreEntityKind } from "@/lib/scores";

type EvolutionMapByName = Record<string, Record<number, number>>;

export function makeEditorialDefinition(kind: ScoreEntityKind, name: string): ScoreDefinition {
  return {
    id: `score.editorial_${kind}_profile` as ScoreDefinition["id"],
    name,
    entityKind: kind,
    categoryId: "score_category.editorial" as ScoreDefinition["categoryId"],
    description: "Editorial profile narrative",
    status: "active",
  };
}

export function buildHistoryFromEvolution(
  evolutionByName: EvolutionMapByName,
  entityName: string,
): { season: number; score: number; rank: number }[] {
  const series = evolutionByName[entityName] ?? {};
  const years = Object.keys(series)
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);

  return years.map((season) => {
    const score = series[season] ?? 0;
    let rank = 1;
    for (const scores of Object.values(evolutionByName)) {
      const peer = scores[season] ?? 0;
      if (peer > score) rank += 1;
    }
    return { season, score, rank };
  });
}

export function trendFromHistory(
  history: { season: number; score: number }[],
): "rising" | "stable" | "declining" {
  if (history.length < 2) return "stable";
  const first = history[0]?.score ?? 0;
  const last = history[history.length - 1]?.score ?? 0;
  const delta = last - first;
  if (delta > 0.001) return "rising";
  if (delta < -0.001) return "declining";
  return "stable";
}
