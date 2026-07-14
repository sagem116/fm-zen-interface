import type { CareerId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerHallOfFame(careerId?: CareerId) {
  const career = useResolvedCareer(careerId);
  return {
    hallOfFame: career?.hallOfFame ?? [],
  };
}
