import type { CareerId, CareerSeasonId } from "../types";
import { useResolvedCareer } from "./_internal";

export function useCareerAchievements(input?: { careerId?: CareerId; seasonId?: CareerSeasonId }) {
  const career = useResolvedCareer(input?.careerId);
  const achievements = career ? Object.values(career.achievements) : [];

  return {
    achievements: input?.seasonId
      ? achievements.filter((item) => item.seasonId === input.seasonId)
      : achievements,
  };
}
