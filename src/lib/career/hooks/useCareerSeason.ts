import type { CareerId, CareerSeasonId } from "../types";
import {
  selectAllSeasons,
  selectCurrentSeason,
  selectSeasonById,
  selectSeasonByNumber,
} from "../selectors";
import { useResolvedCareer } from "./_internal";

export function useCareerSeason(input?: {
  careerId?: CareerId;
  seasonId?: CareerSeasonId;
  season?: number;
}) {
  const career = useResolvedCareer(input?.careerId);
  const seasons = career ? selectAllSeasons(career) : [];
  const currentSeason = career ? selectCurrentSeason(career) : undefined;

  const selectedSeason = career
    ? input?.seasonId
      ? selectSeasonById(career, input.seasonId)
      : input?.season != null
        ? selectSeasonByNumber(career, input.season)
        : currentSeason
    : undefined;

  return {
    seasons,
    currentSeason,
    selectedSeason,
  };
}
