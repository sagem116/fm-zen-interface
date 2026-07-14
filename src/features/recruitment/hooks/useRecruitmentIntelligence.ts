import { useMemo } from "react";
import {
  buildClubProfile,
  buildCoachProfile,
  buildCompetitionProfile,
  buildCountryProfile,
  buildPlayerProfile,
  type DomainEntity,
  type EntityKind,
  type ProfileResult,
} from "@/lib/intelligence";
import type { StyleAnalysis } from "@/lib/profile/style";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import {
  buildDeterministicSummary,
  buildDevelopmentSeries,
  buildRisks,
  buildTrends,
  type DevelopmentPoint,
  type IntelligenceRisk,
  type IntelligenceTrend,
} from "../services/recruitment-intelligence";
import {
  buildRecruitmentStyleAnalysis,
  buildRecruitmentStyleSimilarity,
} from "../services/recruitment-style";
import type { RecruitmentEntity, RecruitmentPlayer } from "../types/recruitment-models";

export type RecruitmentIntelligenceKind = "player" | "coach" | "club" | "competition" | "country";

interface RecruitmentIntelligenceResult {
  profile: ProfileResult | null;
  summary: string;
  development: DevelopmentPoint[];
  trends: IntelligenceTrend[];
  risks: IntelligenceRisk[];
  style: StyleAnalysis | null;
  similar: {
    players: Array<{ name: string; score: number }>;
    coaches: Array<{ name: string; score: number }>;
    clubs: Array<{ name: string; score: number }>;
  };
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function makeProfile(
  kind: EntityKind,
  entity: DomainEntity,
  cohort: DomainEntity[],
): ProfileResult {
  if (kind === "player") return buildPlayerProfile({ entity, cohort });
  if (kind === "coach") return buildCoachProfile({ entity, cohort });
  if (kind === "club") return buildClubProfile({ entity, cohort });
  if (kind === "competition") return buildCompetitionProfile({ entity, cohort });
  return buildCountryProfile({ entity, cohort });
}

function scoreDistance(a: number | null | undefined, b: number | null | undefined): number {
  const av = Number.isFinite(a) ? Number(a) : 0;
  const bv = Number.isFinite(b) ? Number(b) : 0;
  const diff = Math.abs(av - bv);
  return Math.max(0, 100 - diff);
}

function toDomainEntity(entity: RecruitmentEntity): DomainEntity {
  const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
  const stats = (metadata.statistics ?? {}) as Record<string, unknown>;

  return {
    id: entity.id,
    name: entity.name,
    age: Number(metadata.age ?? (entity as RecruitmentPlayer).age ?? 0) || null,
    ca: Number((entity as RecruitmentPlayer).ca ?? entity.score ?? 0) || null,
    cp: Number((entity as RecruitmentPlayer).pa ?? metadata.pa ?? 0) || null,
    avgCA: Number((entity as RecruitmentPlayer).ca ?? entity.score ?? 0) || null,
    avgCP: Number((entity as RecruitmentPlayer).pa ?? metadata.pa ?? 0) || null,
    avgAge: Number(metadata.age ?? (entity as RecruitmentPlayer).age ?? 0) || null,
    goals: Number(stats.gls ?? stats.goals ?? stats["player.statistics.gls"] ?? 0),
    games: Number(stats.games ?? stats["player.statistics.games"] ?? 0),
    titles: Number(stats.titles ?? 0),
    seasons: (((metadata.history as Array<unknown> | undefined) ?? []).length ||
      Number((entity as RecruitmentPlayer).currentSeason ? 1 : 0)),
    internationalPoints: Number(stats.international_points ?? 0),
    playersAbroad: Number(stats.players_abroad ?? 0),
  };
}

function buildIntelligenceInputs(
  kind: EntityKind,
  name: string,
  source: NonNullable<ReturnType<typeof useRecruitmentSourceData>["source"]>,
): { entity: DomainEntity; cohort: DomainEntity[] } | null {
  const pool =
    kind === "player"
      ? source.entities.players
      : kind === "coach"
        ? source.entities.coaches
        : kind === "club"
          ? source.entities.clubs
          : kind === "competition"
            ? source.entities.competitions
            : source.entities.countries;

  const selected = pool.find((item) => normalize(item.name) === normalize(name));
  if (!selected) return null;
  return {
    entity: toDomainEntity(selected),
    cohort: pool.map(toDomainEntity),
  };
}

export function useRecruitmentIntelligence(
  kind: RecruitmentIntelligenceKind,
  name: string,
): {
  isLoading: boolean;
  data: RecruitmentIntelligenceResult | null;
} {
  const { source, isLoading: sourceLoading } = useRecruitmentSourceData();

  const data = useMemo(() => {
    if (!source || !name) return null;

    const inputs = buildIntelligenceInputs(kind, name, source);
    const profile = inputs ? makeProfile(kind, inputs.entity, inputs.cohort) : null;
    const selected =
      source.entities.entities.find(
        (item) => normalize(item.name) === normalize(name) && item.type === kind,
      ) ?? null;
    const style = selected ? buildRecruitmentStyleAnalysis(selected) : null;

    const development =
      kind === "player" && selected
        ? buildDevelopmentSeries(selected as RecruitmentPlayer)
        : [];

    const trends = buildTrends(development, profile);
    const risks = buildRisks(
      development,
      ((selected?.metadata ?? {}) as Record<string, unknown>).statistics as
        | Record<string, unknown>
        | null,
    );

    const stylePeers =
      selected && kind === "player"
        ? buildRecruitmentStyleSimilarity(selected, source.entities.players)
        : [];

    const similarPlayers = source.entities.players
      .filter((item) => normalize(item.name) !== normalize(name))
      .map((item) => ({
        name: item.name,
        score: scoreDistance(item.score, selected?.score ?? null),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const similarCoaches = source.entities.coaches
      .filter((item) => normalize(item.name) !== normalize(name))
      .map((item) => ({
        name: item.name,
        score: scoreDistance(item.score, selected?.score ?? null),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const similarClubs = source.entities.clubs
      .filter((item) => normalize(item.name) !== normalize(name))
      .map((item) => ({
        name: item.name,
        score: scoreDistance(item.score, selected?.score ?? null),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return {
      profile,
      summary: buildDeterministicSummary(
        profile,
        style?.summary ?? "Sem dados suficientes para gerar resumo técnico.",
      ),
      development,
      trends,
      risks,
      style,
      similar: {
        players: stylePeers.length ? stylePeers.slice(0, 4) : similarPlayers,
        coaches: similarCoaches,
        clubs: similarClubs,
      },
    };
  }, [source, kind, name]);

  return {
    isLoading: sourceLoading,
    data,
  };
}
