import type { CareerAttachmentCategory } from "../types";

export interface GalleryCategoryDefinition {
  id: CareerAttachmentCategory;
  label: string;
  description?: string;
}

export const CAREER_GALLERY_CATEGORIES: GalleryCategoryDefinition[] = [
  { id: "squad", label: "Plantel" },
  { id: "tactics", label: "Taticas" },
  { id: "standings", label: "Classificacoes" },
  { id: "transfers", label: "Transferencias" },
  { id: "matches", label: "Jogos" },
  { id: "finals", label: "Finais" },
  { id: "records", label: "Recordes" },
  { id: "other", label: "Outros" },
  { id: "achievement", label: "Conquistas" },
  { id: "trophy", label: "Trofeus" },
  { id: "journal", label: "Diario" },
];
