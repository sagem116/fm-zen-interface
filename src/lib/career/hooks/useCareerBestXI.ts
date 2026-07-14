import type { CareerId, CareerSeasonId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerBestXI(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);
  const seasonId = input?.seasonId ?? career?.currentSeasonId;

  return {
    careerBestXI: career?.bestElevens.career,
    seasonBestXI: career && seasonId ? career.bestElevens.bySeason[seasonId] : undefined,
    bestXIBySeason: career?.bestElevens.bySeason ?? {},
  };
}
