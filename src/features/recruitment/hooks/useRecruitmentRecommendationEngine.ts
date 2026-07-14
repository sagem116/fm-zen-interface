import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRecruitmentKnowledgeBoard } from "./useRecruitmentKnowledgeBoard";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import {
  RECOMMENDATION_PRESETS,
  computeRecommendationExplain,
  recommendationValueMap,
} from "../services/recruitment-recommendations";
import type { TacticalProfileId } from "../constants/recruitment-tactical";
import type { RecommendationCriterionId, RecommendationPreset } from "../types/recruitment-models";

export interface RecommendationEngineInput {
  objective: "player" | "coach";
  roleOrPosition: string;
  tacticalProfileId: TacticalProfileId;
  query: string;
  minCompatibility: number;
  presetId: string;
  criteria: Record<RecommendationCriterionId, { enabled: boolean; weight: number }>;
  sortDir: "asc" | "desc";
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function fallbackPreset(objective: "player" | "coach"): RecommendationPreset {
  return (
    RECOMMENDATION_PRESETS.find((item) => item.objective === objective) ?? RECOMMENDATION_PRESETS[0]
  );
}

export function useRecruitmentRecommendationEngine(input: RecommendationEngineInput) {
  const { source, isLoading: sourceLoading } = useRecruitmentSourceData();

  const board = useRecruitmentKnowledgeBoard({
    tab: input.objective,
    query: input.query,
    minCompatibility: input.minCompatibility,
    profileId: input.tacticalProfileId,
    sortBy: "recruitmentScore",
    sortDir: "desc",
  });

  const selectedPreset = useMemo(() => {
    const preset = RECOMMENDATION_PRESETS.find(
      (item) => item.id === input.presetId && item.objective === input.objective,
    );
    if (!preset) return fallbackPreset(input.objective);
    return {
      ...preset,
      criteria: input.criteria,
    };
  }, [input.presetId, input.objective, input.criteria]);

  const query = useQuery({
    queryKey: [
      "recruitment-recommendation-engine",
      input.objective,
      input.roleOrPosition,
      input.tacticalProfileId,
      input.query,
      input.minCompatibility,
      input.presetId,
      JSON.stringify(input.criteria),
      input.sortDir,
      source?.currentSeason ?? 0,
      source?.totals.players ?? 0,
      source?.totals.coaches ?? 0,
      source?.totals.seasons ?? 0,
      (source?.catalogs.scores ?? []).map((item) => item.id).join("|"),
      (source?.catalogs.dictionary.entries ?? [])
        .map((item) => item.name)
        .slice(0, 32)
        .join("|"),
      board.rows.length,
    ],
    enabled: Boolean(source && board.rows.length),
    queryFn: async () => {
      if (!source) return [];
      const maxMarketValue = Math.max(1, ...(((source.playerUniverse?.list ?? []) as any).map((p: any) => p.ca ?? 0)));
      const maxSalary = Math.max(
        1,
        ...(((source.playerUniverse?.list ?? []) as any).map((p: any) => Number((p.extras?.salary as any) ?? 0))),
      );

      const roleToken = normalize(input.roleOrPosition);

      const rows = board.rows
        .filter((row) => {
          if (!roleToken) return true;
          const pos = normalize(row.profile.tactical.primaryPosition);
          const sec = row.profile.tactical.secondaryPositions.map(normalize).join(" ");
          const role = normalize(
            String(row.profile.general.type === "coach" ? (row.profile.general.name ?? "") : ""),
          );
          const bag = `${pos} ${sec} ${role}`;
          return bag.includes(roleToken);
        })
        .map((row) => {
          const values = recommendationValueMap({
            profile: row.profile,
            recruitmentScore: row.recruitmentScore,
            compatibility: row.compatibility,
            maxMarketValue,
            maxSalary,
          });
          const explain = computeRecommendationExplain({
            preset: selectedPreset,
            values,
            contextLabel:
              input.roleOrPosition ||
              (input.objective === "player" ? "posição alvo" : "função alvo"),
          });
          return {
            ...row,
            recommendationScore: explain.recommendationScore,
            recommendationExplain: explain,
            scoreOverall: values.scoreOverall,
            scorePosition: values.scorePosition,
          };
        });

      const dir = input.sortDir === "asc" ? 1 : -1;
      rows.sort((a, b) => (a.recommendationScore - b.recommendationScore) * dir);
      return rows;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });

  return {
    isLoading: sourceLoading || board.isLoading || query.isLoading,
    preset: selectedPreset,
    rows: query.data ?? [],
    baseRows: board.rows,
  };
}
