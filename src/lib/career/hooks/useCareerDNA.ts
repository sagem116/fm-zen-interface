import type { CareerId, CareerSeasonId } from "../types";
import { selectAllDnaProfiles, selectCareerDna, selectSeasonDna } from "../selectors";
import { useResolvedCareer } from "./_internal";

export function useCareerDNA(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);
  return {
    careerDNA: career ? selectCareerDna(career) : undefined,
    seasonDNA: career && input?.seasonId ? selectSeasonDna(career, input.seasonId) : undefined,
    allSeasonDNA: career ? selectAllDnaProfiles(career) : [],
  };
}
