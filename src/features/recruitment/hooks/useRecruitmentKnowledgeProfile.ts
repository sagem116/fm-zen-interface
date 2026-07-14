import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import { useRecruitmentIntelligence } from "./useRecruitmentIntelligence";
import { useRecruitmentObservations } from "./useRecruitmentObservations";
import { useRecruitmentReports } from "./useRecruitmentReports";
import { useRecruitmentTacticalRecruitment } from "./useRecruitmentTacticalRecruitment";
import {
  buildRecruitmentKnowledgeProfile,
  computeRecruitmentScore,
} from "../services/recruitment-knowledge";
import { useRecruitmentScoreSettingsState } from "../services/recruitment-score-settings";
import type { RecruitmentEntityKind } from "../types/recruitment-models";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function mapKind(kind: RecruitmentEntityKind): "player" | "coach" {
  return kind === "coach" ? "coach" : "player";
}

const neutralVector = {
  possession: 50,
  buildUp: 50,
  shortPassing: 50,
  longPassing: 50,
  progression: 50,
  pressing: 50,
  recovery: 50,
  counterAttack: 50,
  transitions: 50,
  crossing: 50,
  interiorPlay: 50,
  widePlay: 50,
  finishing: 50,
  creativity: 50,
  defensiveIntensity: 50,
  discipline: 50,
};

export function useRecruitmentKnowledgeProfile(kind: RecruitmentEntityKind, name: string) {
  const canUseTactical = kind === "player" || kind === "coach";
  const { source, isLoading: sourceLoading } = useRecruitmentSourceData();
  const { reports } = useRecruitmentReports();
  const { observations } = useRecruitmentObservations();
  const settings = useRecruitmentScoreSettingsState();

  const intelligence = useRecruitmentIntelligence(kind, name);
  const tactical = useRecruitmentTacticalRecruitment({
    profileId: "custom",
    customVector: neutralVector,
    tab: mapKind(kind),
    query: name,
    minCompatibility: canUseTactical ? 0 : 100,
  });

  const selectedEntity = useMemo(() => {
    if (!source || !name) return null;
    return (
      source.entities.entities.find(
        (item) => item.type === kind && normalize(item.name) === normalize(name),
      ) ?? null
    );
  }, [source, kind, name]);

  const query = useQuery({
    queryKey: [
      "recruitment-knowledge-profile",
      kind,
      normalize(name),
      source?.currentSeason ?? 0,
      source?.totals.players ?? 0,
      source?.totals.coaches ?? 0,
      source?.totals.seasons ?? 0,
      (source?.catalogs.scores ?? []).map((item) => item.id).join("|"),
      (source?.catalogs.dictionary.entries ?? [])
        .map((item) => item.name)
        .slice(0, 32)
        .join("|"),
      reports.length,
      observations.length,
      settings.updatedAt,
    ],
    enabled: Boolean(source && selectedEntity && name),
    queryFn: async () => {
      if (!source || !selectedEntity) return null;
      const report =
        reports.find(
          (item) => item.targetId === selectedEntity.id && item.entityKind === selectedEntity.type,
        ) ?? null;
      const timeline = observations.filter(
        (item) => item.entityId === selectedEntity.id && item.entityKind === selectedEntity.type,
      );
      const tacticalCandidate = canUseTactical
        ? (tactical.data?.candidates.find(
            (item) => normalize(item.name) === normalize(selectedEntity.name),
          ) ?? null)
        : null;
      const activePreset =
        settings.presets.find((item) => item.id === settings.activePresetId) ?? settings.presets[0];

      const profile = buildRecruitmentKnowledgeProfile({
        entity: selectedEntity,
        season: source.currentSeason ?? null,
        scoreDefinitions: source.catalogs.scores.map((item) => ({ id: item.id, name: item.name })),
        tactical: tacticalCandidate
          ? {
              global: tacticalCandidate.compatibility.global,
              offensive: tacticalCandidate.compatibility.offensive,
              defensive: tacticalCandidate.compatibility.defensive,
              technical: tacticalCandidate.compatibility.technical,
              physical: tacticalCandidate.compatibility.physical,
              mental: tacticalCandidate.compatibility.mental,
              radar: tacticalCandidate.radar.map((item) => ({
                label: item.axis,
                value: item.score,
              })),
              primaryPosition: tacticalCandidate.position,
              secondaryPositions: tacticalCandidate.positions.map((item) => item.position).slice(1),
              style: tacticalCandidate.summary,
            }
          : null,
        intelligence: intelligence.data
          ? {
              summary: intelligence.data.summary,
              strengths: (intelligence.data.profile?.strengths ?? []).map((item) => item.label),
              weaknesses: (intelligence.data.profile?.weaknesses ?? []).map((item) => item.label),
              trends: intelligence.data.trends.map((item) => item.label),
              development: intelligence.data.development.map((item) => ({
                season: item.season,
                score: item.score,
              })),
              psychological: (intelligence.data.profile?.traits ?? []).map((item) => ({
                label: item.label,
                score: item.score,
              })),
              risk: intelligence.data.risks.length
                ? intelligence.data.risks.reduce((sum, item) => sum + item.value, 0) /
                  intelligence.data.risks.length
                : undefined,
              potential:
                selectedEntity.type === "player"
                  ? ((selectedEntity.metadata?.pa as number | undefined) ?? undefined)
                  : undefined,
              intelligence:
                avgIntelligence(
                  (intelligence.data.profile?.traits ?? []).map((item) => item.score),
                ) ?? undefined,
              consistency:
                scoreByLabel(intelligence.data.profile?.traits ?? [], "consist") ?? undefined,
              versatility:
                scoreByLabel(intelligence.data.profile?.traits ?? [], "versatil") ?? undefined,
              style: tacticalCandidate?.compatibility.global ?? undefined,
            }
          : null,
        market: {
          age:
            (selectedEntity.metadata?.age as number | undefined) ??
            (selectedEntity as { age?: number | null }).age ??
            null,
          marketValue:
            (selectedEntity.metadata?.marketValue as number | undefined) ??
            (selectedEntity as { marketValue?: number | null }).marketValue ??
            null,
          salary: (selectedEntity.metadata?.salary as number | undefined) ?? null,
          contract: (selectedEntity.metadata?.contract as string | undefined) ?? null,
          reputation: (selectedEntity.metadata?.reputation as number | undefined) ?? null,
          personality: (selectedEntity.metadata?.personality as string | undefined) ?? null,
        },
        history: {
          reportIds: report ? [report.id] : [],
          observationIds: timeline.map((item) => item.id),
          timelineIds: [
            ...(report?.timeline ?? []).map((item) => item.id),
            ...timeline.map((item) => item.id),
          ],
        },
      });

      const score = computeRecruitmentScore(profile, activePreset, {
        rankingPoolSize:
          kind === "coach" ? source.entities.coaches.length : (source.playerUniverse?.list ?? []).length,
            maxMarketValue: maxBy(((source.playerUniverse?.list ?? []) as any).map((item: any) => item.ca ?? 0)),
            maxSalary: maxBy(((source.playerUniverse?.list ?? []) as any).map((item: any) => Number((item.extras?.salary as any) ?? 0))),
      });

      return {
        profile,
        recruitmentScore: score.value,
        recruitmentExplain: score.explain,
      };
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    isLoading:
      sourceLoading ||
      intelligence.isLoading ||
      (canUseTactical && tactical.isLoading) ||
      query.isLoading,
    data: query.data ?? null,
  };
}

function maxBy(values: number[]): number {
  if (!values.length) return 1;
  return Math.max(1, ...values.map((value) => (Number.isFinite(value) ? value : 0)));
}

function avgIntelligence(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreByLabel(
  traits: Array<{ label: string; score: number }>,
  token: string,
): number | null {
  const trait = traits.find((item) => item.label.toLowerCase().includes(token));
  return trait ? trait.score : null;
}
