import type { CareerId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerTimeline(careerId?: CareerId) {
  const career = useResolvedCareer(careerId);
  return {
    timeline: career?.timeline ?? [],
  };
}
