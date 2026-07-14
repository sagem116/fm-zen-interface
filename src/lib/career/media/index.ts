import type { CareerAttachmentType } from "../types";

export interface CareerMediaDescriptor {
  name: string;
  type: CareerAttachmentType;
  path: string;
  mimeType: string;
  extension: string;
}

const MEDIA_TYPES: Record<CareerAttachmentType, { mimeType: string; extension: string }> = {
  png: { mimeType: "image/png", extension: ".png" },
  jpg: { mimeType: "image/jpeg", extension: ".jpg" },
  webp: { mimeType: "image/webp", extension: ".webp" },
  gif: { mimeType: "image/gif", extension: ".gif" },
  pdf: { mimeType: "application/pdf", extension: ".pdf" },
  mp4: { mimeType: "video/mp4", extension: ".mp4" },
};

export function createMediaDescriptor(input: {
  name: string;
  type: CareerAttachmentType;
  path: string;
}): CareerMediaDescriptor {
  const spec = MEDIA_TYPES[input.type];
  return {
    name: input.name,
    type: input.type,
    path: input.path,
    mimeType: spec.mimeType,
    extension: spec.extension,
  };
}

export function isSupportedMediaType(type: string): type is CareerAttachmentType {
  return type in MEDIA_TYPES;
}

export function mediaSpec(type: CareerAttachmentType): { mimeType: string; extension: string } {
  return MEDIA_TYPES[type];
}
