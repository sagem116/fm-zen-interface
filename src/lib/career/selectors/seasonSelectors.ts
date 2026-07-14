import type { CareerSeason, CareerSeasonId, CareerSnapshot } from "../types";

export function selectAllSeasons(career: CareerSnapshot): CareerSeason[] {
  return Object.values(career.seasons).sort((a, b) => a.season - b.season);
}

export function selectCurrentSeason(career: CareerSnapshot): CareerSeason | undefined {
  if (career.currentSeasonId) return career.seasons[career.currentSeasonId];
  const seasons = selectAllSeasons(career);
  return seasons[seasons.length - 1];
}

export function selectSeasonById(
  career: CareerSnapshot,
  seasonId: CareerSeasonId,
): CareerSeason | undefined {
  return career.seasons[seasonId];
}

export function selectSeasonByNumber(
  career: CareerSnapshot,
  season: number,
): CareerSeason | undefined {
  return Object.values(career.seasons).find((item) => item.season === season);
}
