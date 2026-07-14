import type { CareerId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerPreferences(careerId?: CareerId) {
  const career = useResolvedCareer(careerId);
  return {
    preferences: career?.preferences,
  };
}
