import { useMemo } from "react";
import { continentOf } from "@/lib/fm-continents";
import type {
  RecruitmentCoach,
  RecruitmentEntity,
  RecruitmentPlayer,
} from "../types/recruitment-models";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export type ScoutEntityTab = "player" | "coach";

export interface RecruitmentScoutFilters {
  query: string;
  tab: ScoutEntityTab;
  club: string;
  country: string;
  competition: string;
  nationality: string;
  continent: string;
  season: number | null;
  minAge: number | null;
  maxAge: number | null;
  minMarketValue: number | null;
  maxMarketValue: number | null;
  personality: string;
  roleOrPosition: string;
  idu: string;
  rankingMin: number | null;
  rankingMax: number | null;
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function valueAsText(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function matchesQuery(entity: RecruitmentEntity, query: string, aliasPool: string[]): boolean {
  const q = norm(query.trim());
  if (!q) return true;

  const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
  const bag = [
    entity.name,
    entity.club ?? "",
    entity.country ?? "",
    entity.competition ?? "",
    valueAsText(metadata.idu),
    valueAsText(metadata.position),
    valueAsText(metadata.role),
    ...aliasPool,
  ]
    .map(norm)
    .join(" ");

  return bag.includes(q);
}

function matchEq(candidate: string | null | undefined, selected: string): boolean {
  if (!selected) return true;
  return norm(candidate ?? "") === norm(selected);
}

export function useRecruitmentScoutSearch(filters: RecruitmentScoutFilters) {
  const { source, isLoading } = useRecruitmentSourceData();

  const results = useMemo(() => {
    if (!source) return [] as Array<RecruitmentPlayer | RecruitmentCoach>;

    const dictionaryEntries = source.catalogs.dictionary.entries;
    const aliasMap = new Map<string, string[]>();
    for (const entry of dictionaryEntries) {
      aliasMap.set(norm(entry.name), [entry.name, ...(entry.aliases ?? [])]);
    }

    const raw =
      filters.tab === "player"
        ? (source.playerUniverse?.list ?? []).map((e: any) => {
            const season = e.seasonYear ?? null;
            const historyPoint = season != null && e.history ? e.history[season] ?? {} : {};
            return {
              id: `player:${e.uid}`,
              type: "player",
              name: e.name,
              club: e.currentClub ?? null,
              country: e.country ?? null,
              competition: (e.extras && (e.extras.competition ?? e.extras.league)) ?? null,
              profileUrl: `/jogadores/${encodeURIComponent(e.name)}`,
              ranking: null,
              score: e.ca ?? null,
              marketValue: historyPoint.value ?? null,
              ca: e.ca ?? null,
              pa: e.pa ?? null,
              age: e.age ?? null,
              position: (e.extras && (e.extras.primary_position ?? e.extras.position)) ?? null,
              currentSeason: season,
              badges: [],
              tags: [],
              metadata: {
                source: "player_universe",
                idu: e.idu ?? null,
                salary: historyPoint.salary ?? null,
                personality: e.extras?.personality ?? null,
                reputation: historyPoint.reputation ?? null,
                age: e.age ?? null,
                marketValue: historyPoint.value ?? null,
                position: e.extras?.primary_position ?? null,
                nationality: e.country ?? null,
                extras: e.extras ?? {},
              },
            } as RecruitmentPlayer;
          })
        : source.entities.coaches;

    return raw.filter((entity) => {
      const metadata = (entity.metadata ?? {}) as Record<string, unknown>;

      const aliasPool = [
        ...(aliasMap.get(norm(entity.name)) ?? []),
        ...(aliasMap.get(norm(entity.club ?? "")) ?? []),
        ...(aliasMap.get(norm(entity.country ?? "")) ?? []),
        ...(aliasMap.get(norm(entity.competition ?? "")) ?? []),
      ];

      if (!matchesQuery(entity, filters.query, aliasPool)) return false;
      if (!matchEq(entity.club, filters.club)) return false;
      if (!matchEq(entity.country, filters.country)) return false;
      if (!matchEq(entity.competition, filters.competition)) return false;
      if (!matchEq(valueAsText(metadata.nationality), filters.nationality)) return false;
      if (!matchEq(continentOf(entity.country ?? null), filters.continent)) return false;
      if (filters.season != null && (entity.currentSeason ?? null) !== filters.season) return false;

      const age =
        typeof metadata.age === "number"
          ? metadata.age
          : ((entity as RecruitmentPlayer | RecruitmentCoach).age ?? null);
      if (filters.minAge != null && (age ?? -Infinity) < filters.minAge) return false;
      if (filters.maxAge != null && (age ?? Infinity) > filters.maxAge) return false;

      const market =
        typeof (entity as RecruitmentPlayer).marketValue === "number"
          ? (entity as RecruitmentPlayer).marketValue
          : typeof metadata.marketValue === "number"
            ? (metadata.marketValue as number)
            : null;
      if (filters.minMarketValue != null && (market ?? -Infinity) < filters.minMarketValue)
        return false;
      if (filters.maxMarketValue != null && (market ?? Infinity) > filters.maxMarketValue)
        return false;

      if (!matchEq(valueAsText(metadata.personality), filters.personality)) return false;

      const roleOrPosition = `${valueAsText(metadata.role)} ${valueAsText(metadata.position)} ${valueAsText((entity as RecruitmentCoach).role)} ${valueAsText((entity as RecruitmentPlayer).position)}`;
      if (filters.roleOrPosition && !norm(roleOrPosition).includes(norm(filters.roleOrPosition)))
        return false;

      const idu = valueAsText(metadata.idu);
      if (filters.idu && !norm(idu).includes(norm(filters.idu))) return false;

      if (filters.rankingMin != null && (entity.ranking ?? -Infinity) < filters.rankingMin)
        return false;
      if (filters.rankingMax != null && (entity.ranking ?? Infinity) > filters.rankingMax)
        return false;

      return true;
    });
  }, [source, filters]);

  return {
    isLoading,
    source,
    results,
  };
}
