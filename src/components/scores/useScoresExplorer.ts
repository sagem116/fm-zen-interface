import { useMemo, useState } from "react";
import { usePlayerStatsData } from "@/lib/usePlayerStatsData";
import { useRankings } from "@/lib/useRankings";
import { usePlayerUniverse } from "@/lib/player-universe";
import {
  debugScore,
  evaluateScore,
  explainScore,
  listScores,
  validateScore,
  type ScoreDefinition,
  type ScoreEntityKind,
  type ScoreResult,
} from "@/lib/scores";
import type { PlayerStatRow } from "@/lib/fm-player-stats-db";
import type { ScoreEvaluationEntry, ScoreHistoryPoint, ScoresFilters } from "./types";

const FAVORITES_KEY = "scores.page.favorites.v1";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-PT"));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function percentileFromRank(index: number, total: number): number {
  if (total <= 1 || index < 0) return 50;
  const p = 1 - index / (total - 1);
  return clamp(p * 100, 0, 100);
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function aggregateRows(rows: PlayerStatRow[]): {
  games: number;
  goals: number;
  assists: number;
  ageAvg: number;
  raAvg: number;
  rmAvg: number;
  rcAvg: number;
  caAvg: number;
  cpAvg: number;
  vpAvg: number;
  salaryAvg: number;
} {
  if (!rows.length) {
    return {
      games: 0,
      goals: 0,
      assists: 0,
      ageAvg: 0,
      raAvg: 0,
      rmAvg: 0,
      rcAvg: 0,
      caAvg: 0,
      cpAvg: 0,
      vpAvg: 0,
      salaryAvg: 0,
    };
  }

  const sum = rows.reduce(
    (acc, row) => {
      acc.games += row.games ?? 0;
      acc.goals += row.gls ?? 0;
      acc.assists += row.ast ?? 0;
      acc.age += row.age ?? 0;
      acc.ra += row.ra ?? 0;
      acc.rm += row.rm ?? 0;
      acc.rc += row.rc ?? 0;
      acc.ca += row.ca ?? 0;
      acc.cp += row.cp ?? 0;
      acc.vp += row.vp ?? 0;
      acc.salary += row.salary ?? 0;
      return acc;
    },
    { games: 0, goals: 0, assists: 0, age: 0, ra: 0, rm: 0, rc: 0, ca: 0, cp: 0, vp: 0, salary: 0 },
  );

  return {
    games: sum.games,
    goals: sum.goals,
    assists: sum.assists,
    ageAvg: sum.age / rows.length,
    raAvg: sum.ra / rows.length,
    rmAvg: sum.rm / rows.length,
    rcAvg: sum.rc / rows.length,
    caAvg: sum.ca / rows.length,
    cpAvg: sum.cp / rows.length,
    vpAvg: sum.vp / rows.length,
    salaryAvg: sum.salary / rows.length,
  };
}

function scoreFormulaText(score: ScoreDefinition): string {
  const parts: string[] = [];
  for (const ref of score.attributeRefs ?? []) parts.push(`${ref.attributeId}*${ref.weight ?? 1}`);
  for (const ref of score.metricRefs ?? []) parts.push(`${ref.metricId}*${ref.weight ?? 1}`);
  for (const ref of score.contextRefs ?? []) parts.push(`${ref.contextId}*${ref.weight ?? 1}`);
  for (const ref of score.modifierRefs ?? []) parts.push(`${ref.modifierId}*${ref.weight ?? 1}`);
  return parts.join(" + ");
}

export function useScoresExplorer(
  initialEntityKind?: ScoreEntityKind,
  initialEntityName?: string,
  initialScoreId?: string,
) {
  const rankingsQuery = useRankings();
  const statsQuery = usePlayerStatsData();
  const universeQuery = usePlayerUniverse();

  const allScores = useMemo(() => listScores(), []);

  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [filters, setFilters] = useState<ScoresFilters>({
    search: "",
    entityKind: initialEntityKind ?? "all",
    category: "all",
    tag: "all",
    status: "all",
    favoritesOnly: false,
  });

  const [selectedScoreId, setSelectedScoreId] = useState<string>(
    initialScoreId ?? allScores[0]?.id ?? "",
  );
  const [selectedEntityName, setSelectedEntityName] = useState<string>(initialEntityName ?? "");
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const selectedScore = useMemo(
    () => allScores.find((score) => score.id === selectedScoreId) ?? allScores[0],
    [allScores, selectedScoreId],
  );

  const playerRows = statsQuery.data?.players ?? [];
  const universePlayers = universeQuery.list ?? [];
  const rankingsData = rankingsQuery.data;

  const playersByName = useMemo(() => {
    const map = new Map<string, PlayerStatRow[]>();
    for (const row of playerRows) {
      const key = normalizeName(row.player_name);
      const current = map.get(key);
      if (current) current.push(row);
      else map.set(key, [row]);
    }
    return map;
  }, [playerRows]);

  const universePlayersByName = useMemo(() => {
    const map = new Map<string, { name: string; uid: string; idu: string | null }>();
    for (const row of universePlayers) {
      const key = normalizeName(row.name);
      if (!map.has(key)) {
        map.set(key, {
          name: row.name,
          uid: row.uid,
          idu: row.idu ?? null,
        });
      }
    }
    return map;
  }, [universePlayers]);

  const standings = rankingsData?.data.standings ?? [];
  const coaches = rankingsData?.data.coaches ?? [];

  const entitiesByKind = useMemo(() => {
    const players = uniqueSorted(universePlayers.map((row) => row.name));
    const coachesList = uniqueSorted([
      ...coaches.map((row) => row.name),
      ...(rankingsData?.ranks.coaches ?? []).map((row) => row.name),
    ]);
    const clubs = uniqueSorted([
      ...(rankingsData?.ranks.clubs ?? []).map((row) => row.name),
      ...standings.map((row) => row.club_name),
      ...playerRows.map((row) => row.club ?? ""),
    ]);
    const competitions = uniqueSorted([
      ...(statsQuery.data?.competitions ?? []).map((row) => row.competition),
      ...standings.map((row) => row.competition ?? row.division_label ?? ""),
      ...(rankingsData?.data.continental ?? []).map((row) => row.competition),
      ...(rankingsData?.data.international ?? []).map((row) => row.competition),
    ]);
    const countries = uniqueSorted(
      [
        ...(rankingsData?.ranks.countries ?? []).map((row) => row.name),
        ...Object.values(rankingsData?.data.clubCountry ?? {}),
        ...playerRows.map((row) => row.nationality ?? row.country ?? ""),
      ].filter((value): value is string => typeof value === "string"),
    );

    return {
      player: players,
      coach: coachesList,
      club: clubs,
      competition: competitions,
      country: countries,
    } satisfies Record<ScoreEntityKind, string[]>;
  }, [universePlayers, playerRows, coaches, rankingsData, standings, statsQuery.data?.competitions]);

  const selectedEntityKind = selectedScore?.entityKind ?? initialEntityKind ?? "player";

  const entityOptions = entitiesByKind[selectedEntityKind] ?? [];

  const activeEntity = selectedEntityName || entityOptions[0] || "";

  const categories = useMemo(
    () => uniqueSorted(allScores.map((score) => score.categoryId)),
    [allScores],
  );

  const tags = useMemo(
    () => uniqueSorted(allScores.flatMap((score) => score.tags ?? [])),
    [allScores],
  );

  const filteredScores = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allScores.filter((score) => {
      if (filters.entityKind !== "all" && score.entityKind !== filters.entityKind) return false;
      if (filters.category !== "all" && score.categoryId !== filters.category) return false;
      if (
        filters.tag !== "all" &&
        !(score.tags ?? []).map((tag) => tag.toLowerCase()).includes(filters.tag.toLowerCase())
      )
        return false;
      if (filters.status !== "all" && (score.status ?? "draft") !== filters.status) return false;
      if (filters.favoritesOnly && !favorites.includes(score.id)) return false;
      if (!q) return true;
      return (
        score.name.toLowerCase().includes(q) ||
        score.id.toLowerCase().includes(q) ||
        (score.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [allScores, filters, favorites]);

  const entitySeasonOptions = useMemo(() => {
    const norm = normalizeName(activeEntity);
    if (!norm) return [] as number[];

    if (selectedEntityKind === "player") {
      const rows = playersByName.get(norm) ?? [];
      return uniqueSorted(rows.map((row) => String(row.season_year))).map(Number);
    }
    if (selectedEntityKind === "coach") {
      return uniqueSorted(
        coaches
          .filter((row) => normalizeName(row.name) === norm)
          .map((row) => String(row.season_year)),
      ).map(Number);
    }
    if (selectedEntityKind === "club") {
      return uniqueSorted(
        standings
          .filter((row) => normalizeName(row.club_name) === norm)
          .map((row) => String(row.season_year)),
      ).map(Number);
    }
    if (selectedEntityKind === "competition") {
      return uniqueSorted(
        standings
          .filter((row) => normalizeName(row.competition ?? row.division_label ?? "") === norm)
          .map((row) => String(row.season_year)),
      ).map(Number);
    }

    const evo = rankingsData?.ranks.evolution.countries[activeEntity] ?? {};
    return Object.keys(evo)
      .map(Number)
      .sort((a, b) => a - b);
  }, [activeEntity, selectedEntityKind, playersByName, coaches, standings, rankingsData]);

  const rankingPercentile = useMemo(() => {
    if (!rankingsData || !activeEntity) return 50;
    const normalized = normalizeName(activeEntity);
    if (selectedEntityKind === "club") {
      const i = rankingsData.ranks.clubs.findIndex((row) => normalizeName(row.name) === normalized);
      return percentileFromRank(i, rankingsData.ranks.clubs.length);
    }
    if (selectedEntityKind === "coach") {
      const i = rankingsData.ranks.coaches.findIndex(
        (row) => normalizeName(row.name) === normalized,
      );
      return percentileFromRank(i, rankingsData.ranks.coaches.length);
    }
    if (selectedEntityKind === "country") {
      const i = rankingsData.ranks.countries.findIndex(
        (row) => normalizeName(row.name) === normalized,
      );
      return percentileFromRank(i, rankingsData.ranks.countries.length);
    }
    return 50;
  }, [rankingsData, activeEntity, selectedEntityKind]);

  const resolveComponentValue = (
    componentId: string,
    kind: ScoreEntityKind,
    entityName: string,
    season: number | null,
  ): number | undefined => {
    const normalized = normalizeName(entityName);

    const playerSourceRows =
      kind === "player"
        ? (playersByName.get(normalized) ?? []).filter((row) =>
            season ? row.season_year === season : true,
          )
        : playerRows.filter((row) => {
            if (season && row.season_year !== season) return false;
            if (kind === "club") return normalizeName(row.club ?? "") === normalized;
            if (kind === "competition") return normalizeName(row.competition) === normalized;
            if (kind === "country")
              return normalizeName(row.nationality ?? row.country ?? "") === normalized;
            return false;
          });

    const agg = aggregateRows(playerSourceRows);

    const standingRows = standings.filter((row) => {
      if (season && row.season_year !== season) return false;
      if (kind === "club") return normalizeName(row.club_name) === normalized;
      if (kind === "competition")
        return normalizeName(row.competition ?? row.division_label ?? "") === normalized;
      if (kind === "country") {
        const country = rankingsData?.data.clubCountry[row.club_name] ?? "";
        return normalizeName(country ?? "") === normalized;
      }
      return false;
    });

    const points = standingRows.reduce((sum, row) => sum + (row.points ?? 0), 0);
    const played = standingRows.reduce((sum, row) => sum + (row.played ?? 0), 0);
    const gf = standingRows.reduce((sum, row) => sum + (row.gf ?? 0), 0);
    const ga = standingRows.reduce((sum, row) => sum + (row.ga ?? 0), 0);

    const goalsPer90 = agg.games > 0 ? agg.goals / agg.games : undefined;
    const assistsPer90 = agg.games > 0 ? agg.assists / agg.games : undefined;
    const pointsPerMatch = played > 0 ? points / played : undefined;
    const gfPer90 = played > 0 ? gf / played : undefined;
    const gaPer90 = played > 0 ? ga / played : undefined;

    if (componentId.startsWith("attribute.")) {
      if (componentId.endsWith("finishing")) return clamp(5 + (goalsPer90 ?? 0) * 7, 1, 20);
      if (componentId.endsWith("passing"))
        return clamp(5 + (agg.assists / Math.max(1, agg.games)) * 7, 1, 20);
      if (componentId.endsWith("first_touch")) return clamp(agg.raAvg || 10, 1, 20);
      if (componentId.endsWith("vision")) return clamp(agg.rmAvg || 10, 1, 20);
      if (componentId.endsWith("decisions")) return clamp(agg.rcAvg || 10, 1, 20);
      if (componentId.endsWith("positioning"))
        return clamp((agg.caAvg + agg.cpAvg) / 2 || 10, 1, 20);
      if (componentId.endsWith("acceleration")) return clamp(22 - agg.ageAvg / 2, 1, 20);
      if (componentId.endsWith("pace")) return clamp(20 - agg.ageAvg / 2.8, 1, 20);
      if (componentId.endsWith("stamina")) return clamp(8 + agg.games / 8, 1, 20);
      return clamp(agg.caAvg || 10, 1, 20);
    }

    if (componentId.startsWith("metric.")) {
      if (componentId.endsWith("goals_per90")) return goalsPer90;
      if (componentId.endsWith("assists_per90")) return assistsPer90;
      if (componentId.endsWith("xg_per90")) return goalsPer90 ? goalsPer90 * 1.15 : undefined;
      if (componentId.endsWith("xa_per90")) return assistsPer90 ? assistsPer90 * 1.15 : undefined;
      if (componentId.endsWith("minutes_played")) return agg.games * 90;
      if (componentId.endsWith("points_per_match")) return pointsPerMatch;
      if (componentId.endsWith("goals_scored_per90")) return gfPer90;
      if (componentId.endsWith("goals_conceded_per90")) return gaPer90;
      if (componentId.endsWith("pass_completion_pct"))
        return clamp((agg.rmAvg || 6.5) * 10, 45, 99);
      if (componentId.endsWith("possession_pct"))
        return clamp(35 + rankingPercentile * 0.3, 20, 80);
      if (componentId.endsWith("clean_sheets_pct"))
        return gaPer90 == null ? undefined : clamp(100 - gaPer90 * 40, 0, 100);
      if (componentId.endsWith("reputation_index")) return rankingPercentile;
      if (componentId.endsWith("financial_strength_index"))
        return clamp((agg.vpAvg / Math.max(1, agg.salaryAvg)) * 25, 0, 100);
      if (componentId.endsWith("transfer_profit_ratio"))
        return clamp(agg.vpAvg / Math.max(1, agg.salaryAvg), 0, 10);
      if (componentId.endsWith("cup_win_rate")) return clamp(rankingPercentile / 10, 0, 10);
      if (componentId.endsWith("youth_minutes_pct")) return clamp(120 - agg.ageAvg * 4, 0, 100);
      if (componentId.endsWith("expected_points_per_match"))
        return pointsPerMatch ? pointsPerMatch * 0.95 : undefined;
      return rankingPercentile;
    }

    if (componentId.startsWith("context.")) {
      if (componentId.endsWith("minutes")) return agg.games * 90;
      if (componentId.endsWith("age")) return agg.ageAvg || 24;
      if (componentId.endsWith("competition_reputation")) return rankingPercentile;
      if (componentId.endsWith("opponent_quality"))
        return clamp(45 + rankingPercentile * 0.4, 0, 100);
      if (componentId.endsWith("league_strength"))
        return clamp(40 + rankingPercentile * 0.45, 0, 100);
      if (componentId.endsWith("team_strength")) return clamp(35 + rankingPercentile * 0.5, 0, 100);
      if (componentId.endsWith("squad_stability"))
        return clamp(100 - entitySeasonOptions.length * 3, 20, 100);
      if (componentId.endsWith("fixture_congestion")) return clamp(played * 1.2, 0, 100);
      if (componentId.endsWith("era_weight"))
        return season ? clamp(50 + (season - 2000) * 1.2, 0, 100) : 70;
      return 60;
    }

    if (componentId.startsWith("modifier.")) {
      if (componentId.endsWith("small_sample_size")) return clamp(100 - agg.games * 4, 0, 100);
      if (componentId.endsWith("low_minutes")) return clamp(100 - agg.games * 5, 0, 100);
      if (componentId.endsWith("injury_disruption")) return clamp(80 - agg.games * 2, 0, 100);
      if (componentId.endsWith("recency_boost"))
        return season ? clamp(40 + (season - 2010) * 2, 0, 100) : 50;
      if (componentId.endsWith("consistency")) return clamp(55 + rankingPercentile * 0.35, 0, 100);
      if (componentId.endsWith("big_matches")) return clamp(rankingPercentile, 0, 100);
      if (componentId.endsWith("decline_risk")) return clamp(agg.ageAvg * 3.5, 0, 100);
      if (componentId.endsWith("momentum_boost")) return clamp(rankingPercentile * 0.9, 0, 100);
      if (componentId.endsWith("versatility")) return clamp((agg.caAvg + agg.cpAvg) * 2.5, 0, 100);
      return 50;
    }

    return undefined;
  };

  const evaluateForEntity = (
    score: ScoreDefinition,
    entityName: string,
    season: number | null,
  ): ScoreEvaluationEntry => {
    const normalizedEntity = normalizeName(entityName);
    const metricRows =
      score.entityKind === "player"
        ? (playersByName.get(normalizedEntity) ?? []).filter((row) =>
            season ? row.season_year === season : true,
          )
        : [];
    const metricsAvailable = score.entityKind !== "player" || metricRows.length > 0;
    const universeIdentity = universePlayersByName.get(normalizedEntity) ?? null;

    const input = {
      scoreId: score.id,
      entityKind: score.entityKind,
      entityId:
        score.entityKind === "player"
          ? (universeIdentity?.uid ?? universeIdentity?.idu ?? entityName)
          : entityName,
      attributes: (score.attributeRefs ?? []).map((ref) => ({
        id: ref.attributeId,
        weight: ref.weight,
        value: resolveComponentValue(ref.attributeId, score.entityKind, entityName, season),
      })),
      metrics: (score.metricRefs ?? []).map((ref) => ({
        id: ref.metricId,
        weight: ref.weight,
        value: resolveComponentValue(ref.metricId, score.entityKind, entityName, season),
      })),
      contexts: (score.contextRefs ?? []).map((ref) => ({
        id: ref.contextId,
        weight: ref.weight,
        value: resolveComponentValue(ref.contextId, score.entityKind, entityName, season),
      })),
      modifiers: (score.modifierRefs ?? []).map((ref) => ({
        id: ref.modifierId,
        weight: ref.weight,
        value: resolveComponentValue(ref.modifierId, score.entityKind, entityName, season),
      })),
    };

    const result = evaluateScore(input);
    const explain = explainScore(result);
    const validation = validateScore({ definition: score, evaluateInput: input, result });
    const debug = debugScore(result);

    if (!metricsAvailable) {
      return {
        entityName,
        score: 0,
        grade: "indisponivel",
        confidence: 0,
        result,
        explain,
        validation,
        debug,
      };
    }

    return {
      entityName,
      score: result.score ?? result.value ?? 0,
      grade: result.grade ?? "n/a",
      confidence: result.confidence?.value ?? 0,
      result,
      explain,
      validation,
      debug,
    };
  };

  const selectedEvaluation = useMemo(() => {
    if (!selectedScore || !activeEntity) return null;
    return evaluateForEntity(selectedScore, activeEntity, selectedSeason);
  }, [selectedScore, activeEntity, selectedSeason]);

  const ranking = useMemo(() => {
    if (!selectedScore) return [] as ScoreEvaluationEntry[];
    const list = entitiesByKind[selectedScore.entityKind] ?? [];
    return list
      .slice(0, 2000)
      .map((entityName) => evaluateForEntity(selectedScore, entityName, selectedSeason))
      .sort((a, b) => b.score - a.score);
  }, [selectedScore, entitiesByKind, selectedSeason]);

  const history = useMemo(() => {
    if (!selectedScore || !activeEntity) return [] as ScoreHistoryPoint[];
    const seasons = entitySeasonOptions;
    return seasons
      .map((season) => {
        const result = evaluateForEntity(selectedScore, activeEntity, season);
        return {
          season,
          score: result.score,
          grade: result.grade,
          confidence: result.confidence,
        };
      })
      .sort((a, b) => a.season - b.season);
  }, [selectedScore, activeEntity, entitySeasonOptions]);

  const toggleFavorite = (scoreId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(scoreId);
      const next = exists ? prev.filter((id) => id !== scoreId) : [...prev, scoreId];
      saveFavorites(next);
      return next;
    });
  };

  const selectedRankIndex = ranking.findIndex(
    (entry) => normalizeName(entry.entityName) === normalizeName(activeEntity),
  );

  return {
    loading: rankingsQuery.isLoading || statsQuery.isLoading || universeQuery.isLoading,
    allScores,
    filteredScores,
    selectedScore,
    selectedScoreId,
    setSelectedScoreId,
    selectedEntityKind,
    selectedEntityName: activeEntity,
    setSelectedEntityName,
    selectedSeason,
    setSelectedSeason,
    entitySeasonOptions,
    entityOptions,
    categories,
    tags,
    filters,
    setFilters,
    favorites,
    toggleFavorite,
    ranking,
    selectedRankIndex,
    selectedEvaluation,
    history,
    diagnostics: {
      playerUniverseCount: universePlayers.length,
      scoresPlayerOptionsCount: entitiesByKind.player.length,
      playersWithMetricsCount: playersByName.size,
    },
    scoreFormulaText,
    compareEntities: (left: string, right: string) => {
      if (!selectedScore) return { left: null, right: null };
      return {
        left: left ? evaluateForEntity(selectedScore, left, selectedSeason) : null,
        right: right ? evaluateForEntity(selectedScore, right, selectedSeason) : null,
      };
    },
  };
}
