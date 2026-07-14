import type {
  AttachmentId,
  CareerAttachmentCategory,
  CareerMuseum,
  CareerSeasonId,
} from "../types";
import { nowIso } from "../utils";
import { CAREER_GALLERY_CATEGORIES } from "../gallery";

export function createSeasonMuseum(seasonId: CareerSeasonId): CareerMuseum {
  return {
    seasonId,
    categories: CAREER_GALLERY_CATEGORIES.map((item) => item.id),
    attachmentIds: [],
    updatedAt: nowIso(),
  };
}

export function addAttachmentToMuseum(
  museum: CareerMuseum,
  attachmentId: AttachmentId,
  category?: CareerAttachmentCategory,
): CareerMuseum {
  const nextCategories =
    category && !museum.categories.includes(category)
      ? [...museum.categories, category]
      : museum.categories;

  return {
    ...museum,
    categories: nextCategories,
    attachmentIds: museum.attachmentIds.includes(attachmentId)
      ? museum.attachmentIds
      : [...museum.attachmentIds, attachmentId],
    updatedAt: nowIso(),
  };
}
