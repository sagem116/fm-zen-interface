import type { CareerId, CareerSeasonId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerJournal(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);
  const seasonId = input?.seasonId ?? career?.currentSeasonId;

  return {
    journal: career && seasonId ? career.journals[seasonId] : undefined,
  };
}
