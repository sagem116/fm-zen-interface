import type { CareerSeason, CareerSeasonCreateInput, CareerSeasonId } from "../types";
import { nowIso, toCareerSeasonId } from "../utils";

export function createCareerSeason(input: CareerSeasonCreateInput): CareerSeason {
  const now = nowIso();
  return {
    id: toCareerSeasonId(input.id),
    season: input.season,
    club: input.club,
    coach: input.coach,
    country: input.country,
    league: input.league,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCareerSeason(
  season: CareerSeason,
  patch: Partial<Omit<CareerSeason, "id" | "createdAt">>,
): CareerSeason {
  return {
    ...season,
    ...patch,
    id: season.id,
    createdAt: season.createdAt,
    updatedAt: nowIso(),
  };
}

export function sortSeasonsAsc(seasons: CareerSeason[]): CareerSeason[] {
  return [...seasons].sort((a, b) => a.season - b.season);
}

export function mapSeasonsById(seasons: CareerSeason[]): Record<CareerSeasonId, CareerSeason> {
  return Object.fromEntries(seasons.map((season) => [season.id, season])) as Record<
    CareerSeasonId,
    CareerSeason
  >;
}
