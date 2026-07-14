import type { CareerId, CareerSeasonId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerTrophies(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);
  const trophies = career ? Object.values(career.trophies) : [];

  return {
    trophies: input?.seasonId
      ? trophies.filter((item) => item.seasonId === input.seasonId)
      : trophies,
  };
}
