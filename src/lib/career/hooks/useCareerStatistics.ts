import type { CareerId, CareerSeasonId } from "../types";
import {
  selectCareerStatistics,
  selectSeasonAssessments,
  selectTransferAssessments,
} from "../selectors";
import { useResolvedCareer } from "./_internal";

export function useCareerStatistics(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);

  return {
    statistics: career ? selectCareerStatistics(career) : undefined,
    seasonAssessments: career ? selectSeasonAssessments(career, input?.seasonId) : undefined,
    transferAssessments: career ? selectTransferAssessments(career, input?.seasonId) : undefined,
    records: career?.records,
  };
}
