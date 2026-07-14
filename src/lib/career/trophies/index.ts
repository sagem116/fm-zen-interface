import type { CareerSeason, CareerTrophy, TrophyId } from "../types";
import { nowIso, toTrophyId } from "../utils";

export interface TrophyCreateInput {
  id?: TrophyId;
  season: CareerSeason;
  name: string;
  competition: string;
  description?: string;
}

export function createCareerTrophy(input: TrophyCreateInput): CareerTrophy {
  return {
    id: toTrophyId(input.id),
    seasonId: input.season.id,
    name: input.name,
    competition: input.competition,
    season: input.season.season,
    club: input.season.club,
    description: input.description,
    attachmentIds: [],
    createdAt: nowIso(),
  };
}

export function attachToTrophy(
  trophy: CareerTrophy,
  attachmentId: `career_attachment.${string}`,
): CareerTrophy {
  return {
    ...trophy,
    attachmentIds: trophy.attachmentIds.includes(attachmentId)
      ? trophy.attachmentIds
      : [...trophy.attachmentIds, attachmentId],
  };
}
