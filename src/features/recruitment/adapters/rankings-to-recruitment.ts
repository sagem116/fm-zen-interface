import type { PlayerProfileDataRow } from "@/lib/usePlayerProfilesData";
import type { RecruitmentEntitiesPayload } from "../types/recruitment-models";

export interface RecruitmentRankingAdapterOutput {
  totals: {
    players: number;
    coaches: number;
    clubs: number;
    competitions: number;
    seasons: number;
  };
  market: {
    playersAvailable: number;
    playersActive: number;
    coachesActive: number;
    competitionsObserved: number;
  };
}

export function adaptPlayerProfilesToRecruitment(
  rows: PlayerProfileDataRow[],
  entities: RecruitmentEntitiesPayload,
): RecruitmentRankingAdapterOutput {
  const seasonSet = new Set(rows.map((row) => row.season_year).filter((year) => year > 0));
  const latestSeason = seasonSet.size ? Math.max(...seasonSet) : 0;
  const latestPlayers = entities.players.filter((row) => (row.currentSeason ?? 0) === latestSeason);
  const playersActive = latestPlayers.filter((row) => (row.club ?? "").trim().length > 0).length;
  const playersAvailable = latestPlayers.filter((row) => (row.club ?? "").trim().length === 0).length;
  const coachesActive = entities.coaches.filter((row) => (row.club ?? "").trim().length > 0).length;
  const competitionsObserved = entities.competitions.length;

  return {
    totals: {
      players: entities.players.length,
      coaches: entities.coaches.length,
      clubs: entities.clubs.length,
      competitions: entities.competitions.length,
      seasons: seasonSet.size,
    },
    market: {
      playersAvailable,
      playersActive,
      coachesActive,
      competitionsObserved,
    },
  };
}
