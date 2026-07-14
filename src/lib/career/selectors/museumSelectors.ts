import type {
  AttachmentId,
  CareerAttachment,
  CareerAttachmentCategory,
  CareerSeasonId,
  CareerSnapshot,
} from "../types";

export function selectSeasonMuseum(career: CareerSnapshot, seasonId: CareerSeasonId) {
  return career.museums[seasonId];
}

export function selectSeasonAttachments(
  career: CareerSnapshot,
  seasonId: CareerSeasonId,
): CareerAttachment[] {
  return Object.values(career.attachments)
    .filter((attachment) => attachment.seasonId === seasonId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function selectAttachmentsByCategory(
  career: CareerSnapshot,
  seasonId: CareerSeasonId,
  category: CareerAttachmentCategory,
): CareerAttachment[] {
  return selectSeasonAttachments(career, seasonId).filter(
    (attachment) => attachment.category === category,
  );
}

export function selectAttachmentMap(
  career: CareerSnapshot,
): Record<AttachmentId, CareerAttachment> {
  return career.attachments;
}
