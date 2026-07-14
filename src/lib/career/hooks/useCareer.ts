import type { CareerId } from "../types";
import { selectCareerList } from "../selectors";
import { useCareerStoreSnapshot, useResolvedCareer } from "./_internal";

export function useCareer(careerId?: CareerId) {
  const snapshot = useCareerStoreSnapshot();
  const career = useResolvedCareer(careerId);
  const careers = selectCareerList(snapshot);

  return {
    activeCareerId: snapshot.activeCareerId,
    career,
    careers,
  };
}
