import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import { useRecruitmentObservations } from "./useRecruitmentObservations";
import { useRecruitmentReports } from "./useRecruitmentReports";
import {
  buildRecruitmentKnowledgeProfile,
  computeRecruitmentScore,
} from "../services/recruitment-knowledge";
import { useRecruitmentScoreSettingsState } from "../services/recruitment-score-settings";

function asDate(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function useRecruitmentKnowledgeStats() {
  const { source, isLoading } = useRecruitmentSourceData();
  const { observations } = useRecruitmentObservations();
  const { reports } = useRecruitmentReports();
  const settings = useRecruitmentScoreSettingsState();

  const data = useMemo(() => {
    if (!source) return null;

    const entities = [...source.entities.players, ...source.entities.coaches];
    const profileCount = entities.length;

    const observedEntityIds = new Set<string>([
      ...observations.map((item) => `${item.entityKind}:${item.entityId}`),
      ...reports.map((item) => `${item.entityKind ?? "unknown"}:${item.targetId}`),
    ]);

    const coverage = entities.length ? (observedEntityIds.size / entities.length) * 100 : 0;

    const latestObservation = Math.max(
      ...observations.map((item) => asDate(item.updatedAt ?? item.createdAt)),
      0,
    );
    const latestReport = Math.max(
      ...reports.map((item) => asDate(item.updatedAt ?? item.createdAt)),
      0,
    );
    const lastUpdatedAt = new Date(
      Math.max(latestObservation, latestReport, Date.now()),
    ).toISOString();

    const activePreset =
      settings.presets.find((item) => item.id === settings.activePresetId) ?? settings.presets[0];
    const maxMarketValue = Math.max(1, ...(((source.playerUniverse?.list ?? []) as any).map((item: any) => item.ca ?? 0)));
    const maxSalary = Math.max(
      1,
      ...(((source.playerUniverse?.list ?? []) as any).map((item: any) => Number((item.extras?.salary as any) ?? 0))),
    );

    const samples = entities.slice(0, 180).map((entity) => {
      const profile = buildRecruitmentKnowledgeProfile({
        entity,
        season: source.currentSeason ?? null,
        scoreDefinitions: source.catalogs.scores.map((item) => ({ id: item.id, name: item.name })),
      });
      const score = computeRecruitmentScore(profile, activePreset, {
        rankingPoolSize:
          entity.type === "coach" ? source.entities.coaches.length : (source.playerUniverse?.list ?? []).length,
        maxMarketValue,
        maxSalary,
      });
      return score.value;
    });

    const mean = samples.length
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : 0;

    return {
      profilesBuilt: profileCount,
      coverage: Number(coverage.toFixed(1)),
      lastUpdatedAt,
      scoreMean: Number(mean.toFixed(1)),
      scoreMax: samples.length ? Math.max(...samples) : 0,
      scoreMin: samples.length ? Math.min(...samples) : 0,
      lastPresetName: activePreset.name,
    };
  }, [source, observations, reports, settings]);

  return {
    isLoading,
    data,
  };
}
