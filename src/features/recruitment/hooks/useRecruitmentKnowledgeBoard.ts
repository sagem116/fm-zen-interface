import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tacticalPresetById, type TacticalProfileId } from "../constants/recruitment-tactical";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import { useRecruitmentObservations } from "./useRecruitmentObservations";
import { useRecruitmentReports } from "./useRecruitmentReports";
import {
  useRecruitmentTacticalRecruitment,
  type TacticalEntityTab,
} from "./useRecruitmentTacticalRecruitment";
import {
  buildRecruitmentKnowledgeProfile,
  computeRecruitmentScore,
} from "../services/recruitment-knowledge";
import { useRecruitmentScoreSettingsState } from "../services/recruitment-score-settings";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function useRecruitmentKnowledgeBoard(input: {
  tab: TacticalEntityTab;
  query: string;
  minCompatibility: number;
  profileId: TacticalProfileId;
  sortBy: "recruitmentScore" | "compatibility" | "age" | "value";
  sortDir: "asc" | "desc";
}) {
  const { source, isLoading: sourceLoading } = useRecruitmentSourceData();
  const settings = useRecruitmentScoreSettingsState();
  const { reports } = useRecruitmentReports();
  const { observations } = useRecruitmentObservations();

  const tactical = useRecruitmentTacticalRecruitment({
    tab: input.tab,
    query: input.query,
    minCompatibility: input.minCompatibility,
    profileId: input.profileId,
    customVector: tacticalPresetById(input.profileId).vector,
  });

  const query = useQuery({
    queryKey: [
      "recruitment-knowledge-board",
      input.tab,
      input.query,
      input.minCompatibility,
      input.profileId,
      input.sortBy,
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
      settings.updatedAt,
      reports.length,
      observations.length,
      tactical.data?.candidates.length ?? 0,
    ],
    enabled: Boolean(source && tactical.data),
    queryFn: async () => {
      if (!source || !tactical.data) return [];
      const activePreset =
        settings.presets.find((item) => item.id === settings.activePresetId) ?? settings.presets[0];

      const maxMarketValue = Math.max(
        1,
          ...((source.playerUniverse?.list ?? []) as any).map((item: any) => item.ca ?? 0),
        );
        const maxSalary = Math.max(
          1,
          ...((source.playerUniverse?.list ?? []) as any).map((item: any) => Number((item.extras?.salary as any) ?? 0)),
      );

      const rows = tactical.data.candidates
        .map((candidate) => {
          const entity =
            source.entities.entities.find((item) => item.id === candidate.id) ??
            source.entities.entities.find(
              (item) =>
                item.type === candidate.kind && normalize(item.name) === normalize(candidate.name),
            );
          if (!entity) return null;

          const report =
            reports.find(
              (item) => item.targetId === entity.id && item.entityKind === entity.type,
            ) ?? null;
          const obs = observations.filter(
            (item) => item.entityKind === entity.type && item.entityId === entity.id,
          );

          const profile = buildRecruitmentKnowledgeProfile({
            entity,
            season: source.currentSeason ?? null,
            scoreDefinitions: source.catalogs.scores.map((item) => ({
              id: item.id,
              name: item.name,
            })),
            tactical: {
              global: candidate.compatibility.global,
              offensive: candidate.compatibility.offensive,
              defensive: candidate.compatibility.defensive,
              technical: candidate.compatibility.technical,
              physical: candidate.compatibility.physical,
              mental: candidate.compatibility.mental,
              radar: candidate.radar.map((item) => ({ label: item.axis, value: item.score })),
              primaryPosition: candidate.position,
              secondaryPositions: candidate.positions.map((item) => item.position).slice(1),
              style: candidate.summary,
            },
            intelligence: {
              summary: candidate.summary,
              strengths: candidate.strengths,
              weaknesses: candidate.weaknesses,
              trends: candidate.styleIndicators.map((item) => item.label),
              development: [],
              psychological: [],
              risk: undefined,
              potential: undefined,
              intelligence: candidate.compatibility.mental,
              consistency: undefined,
              versatility:
                candidate.positions.length > 1
                  ? Math.min(100, 40 + candidate.positions.length * 12)
                  : 45,
              style: candidate.compatibility.global,
            },
            market: {
              age: candidate.age,
              marketValue: (entity as { marketValue?: number | null }).marketValue ?? null,
              salary: Number(entity.metadata?.salary ?? null),
              contract:
                typeof entity.metadata?.contract === "string" ? entity.metadata.contract : null,
              reputation: Number(entity.metadata?.reputation ?? null),
              personality:
                typeof entity.metadata?.personality === "string"
                  ? entity.metadata.personality
                  : null,
            },
            history: {
              reportIds: report ? [report.id] : [],
              observationIds: obs.map((item) => item.id),
              timelineIds: [
                ...(report?.timeline ?? []).map((item) => item.id),
                ...obs.map((item) => item.id),
              ],
            },
          });

          const score = computeRecruitmentScore(profile, activePreset, {
            rankingPoolSize:
              input.tab === "coach"
                ? source.entities.coaches.length
                : (source.playerUniverse?.list ?? []).length,
            maxMarketValue,
            maxSalary,
          });

          return {
            id: candidate.id,
            name: candidate.name,
            club: candidate.club,
            country: candidate.country,
            age: candidate.age,
            compatibility: candidate.compatibility.global,
            marketValue: (entity as { marketValue?: number | null }).marketValue ?? null,
            recruitmentScore: score.value,
            explain: score.explain,
            profile,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const direction = input.sortDir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        if (input.sortBy === "compatibility")
          return (a.compatibility - b.compatibility) * direction;
        if (input.sortBy === "age") return ((a.age ?? 0) - (b.age ?? 0)) * direction;
        if (input.sortBy === "value")
          return ((a.marketValue ?? 0) - (b.marketValue ?? 0)) * direction;
        return (a.recruitmentScore - b.recruitmentScore) * direction;
      });

      return rows;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });

  return {
    isLoading: sourceLoading || tactical.isLoading || query.isLoading,
    rows: query.data ?? [],
  };
}
