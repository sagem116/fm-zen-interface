import type { CareerId, CareerSeasonId } from "../types";
import { selectSeasonAttachments, selectSeasonMuseum } from "../selectors";
import { useResolvedCareer } from "./_internal";

export function useCareerMuseum(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);
  const seasonId = input?.seasonId ?? career?.currentSeasonId;

  return {
    museum: career && seasonId ? selectSeasonMuseum(career, seasonId) : undefined,
    attachments: career && seasonId ? selectSeasonAttachments(career, seasonId) : [],
  };
}
