import type {
  AttachmentId,
  CareerAttachment,
  CareerAttachmentCategory,
  CareerAttachmentType,
  CareerSeasonId,
} from "../types";
import { nowIso, toAttachmentId } from "../utils";

export const SUPPORTED_ATTACHMENT_TYPES: CareerAttachmentType[] = [
  "png",
  "jpg",
  "webp",
  "gif",
  "pdf",
  "mp4",
];

export const DEFAULT_ATTACHMENT_CATEGORIES: CareerAttachmentCategory[] = [
  "squad",
  "tactics",
  "standings",
  "transfers",
  "matches",
  "finals",
  "records",
  "other",
  "achievement",
  "trophy",
  "journal",
];

export interface AttachmentCreateInput {
  id?: AttachmentId;
  seasonId: CareerSeasonId;
  name: string;
  type: CareerAttachmentType;
  category: CareerAttachmentCategory;
  path: string;
  date?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function createCareerAttachment(input: AttachmentCreateInput): CareerAttachment {
  return {
    id: toAttachmentId(input.id),
    seasonId: input.seasonId,
    name: input.name,
    type: input.type,
    category: input.category,
    path: input.path,
    date: input.date ?? nowIso(),
    description: input.description,
    metadata: input.metadata,
  };
}
