import { useMemo, useState } from "react";
import { useScoresExplorer } from "@/components/scores/useScoresExplorer";
import type { ScoreEntityKind } from "@/lib/scores";
import type { ScoreEvaluationEntry } from "@/components/scores/types";

export type RankingScope = "world" | "continental" | "national" | "competition" | "club" | "season";

export interface RankingsFiltersState {
  season?: number;
  continent?: string;
  country?: string;
  competition?: string;
  club?: string;
  nationality?: string;
  position?: string;
  personality?: string;
  foot?: string;
  minAge?: number;
  maxAge?: number;
  minMinutes?: number;
  minHeight?: number;
  status?: string;
  topX?: number;
}

/**
 * Lightweight UI layer on top of `useScoresExplorer`.
 * NO new engine calls — only filtering/derivation over existing `ranking`.
 */
export function useRankingsExplorer(
  initialEntityKind: ScoreEntityKind = "player",
  initialScoreId?: string,
) {
  const explorer = useScoresExplorer(initialEntityKind, "", initialScoreId);

  const [scope, setScope] = useState<RankingScope>("world");
  const [rankingFilters, setRankingFilters] = useState<RankingsFiltersState>({ topX: 100 });

  const filteredRanking = useMemo<ScoreEvaluationEntry[]>(() => {
    let list = explorer.ranking;
    // At this stage we only have entityName + score/grade/confidence.
    // Filters are applied loosely; extra dimensions (age, minutes, etc.) plug in
    // when the profile store exposes them in future phases.
    if (rankingFilters.topX && rankingFilters.topX > 0) {
      list = list.slice(0, rankingFilters.topX);
    }
    return list;
  }, [explorer.ranking, rankingFilters.topX]);

  const stats = useMemo(() => {
    const list = explorer.ranking;
    if (!list.length) {
      return {
        count: 0,
        avg: 0,
        max: 0,
        min: 0,
        elite: 0,
        worldClass: 0,
        distribution: [] as { grade: string; count: number }[],
      };
    }
    const scores = list.map((e) => e.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const byGrade = new Map<string, number>();
    for (const entry of list) {
      byGrade.set(entry.grade, (byGrade.get(entry.grade) ?? 0) + 1);
    }
    const distribution = Array.from(byGrade, ([grade, count]) => ({ grade, count })).sort(
      (a, b) => b.count - a.count,
    );
    const elite = (byGrade.get("Elite") ?? 0) + (byGrade.get("elite") ?? 0);
    const worldClass = (byGrade.get("World Class") ?? 0) + (byGrade.get("world_class") ?? 0);
    return { count: list.length, avg, max, min, elite, worldClass, distribution };
  }, [explorer.ranking]);

  const lastSeason = useMemo(() => {
    if (explorer.selectedSeason != null) return explorer.selectedSeason;
    if (explorer.entitySeasonOptions.length) {
      return Math.max(...explorer.entitySeasonOptions);
    }
    return null;
  }, [explorer.selectedSeason, explorer.entitySeasonOptions]);

  return {
    ...explorer,
    scope,
    setScope,
    rankingFilters,
    setRankingFilters,
    filteredRanking,
    stats,
    lastSeason,
  };
}

export type RankingsExplorer = ReturnType<typeof useRankingsExplorer>;
