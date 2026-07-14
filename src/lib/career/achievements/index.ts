import type {
  AchievementId,
  CareerAchievement,
  CareerAchievementType,
  CareerSeason,
} from "../types";
import { nowIso, toAchievementId } from "../utils";

export interface AchievementCreateInput {
  id?: AchievementId;
  season: CareerSeason;
  name: string;
  type: CareerAchievementType;
  competition?: string;
  personalComment?: string;
}

export function createCareerAchievement(input: AchievementCreateInput): CareerAchievement {
  return {
    id: toAchievementId(input.id),
    seasonId: input.season.id,
    name: input.name,
    type: input.type,
    competition: input.competition,
    season: input.season.season,
    personalComment: input.personalComment,
    attachmentIds: [],
    createdAt: nowIso(),
  };
}

export function attachToAchievement(
  achievement: CareerAchievement,
  attachmentId: `career_attachment.${string}`,
): CareerAchievement {
  return {
    ...achievement,
    attachmentIds: achievement.attachmentIds.includes(attachmentId)
      ? achievement.attachmentIds
      : [...achievement.attachmentIds, attachmentId],
  };
}
