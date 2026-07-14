import type {
  CareerDnaCategory,
  CareerDnaDimension,
  CareerDnaProfile,
  CareerSeasonId,
} from "../types";
import { nowIso } from "../utils";

export const CAREER_DNA_CATEGORIES: CareerDnaCategory[] = [
  "mercado",
  "tatica",
  "desenvolvimento",
  "competicoes",
  "transferencias",
  "formacao",
  "nacionalidades",
  "faixa_etaria",
  "perfil_jogadores",
];

export function createEmptyDnaProfile(seasonId?: CareerSeasonId): CareerDnaProfile {
  const dimensions: CareerDnaDimension[] = CAREER_DNA_CATEGORIES.map((category) => ({
    category,
    tags: [],
  }));

  return {
    seasonId,
    dimensions,
    updatedAt: nowIso(),
  };
}

export function upsertDnaDimension(
  profile: CareerDnaProfile,
  nextDimension: CareerDnaDimension,
): CareerDnaProfile {
  const dimensions = profile.dimensions.some((item) => item.category === nextDimension.category)
    ? profile.dimensions.map((item) =>
        item.category === nextDimension.category ? nextDimension : item,
      )
    : [...profile.dimensions, nextDimension];

  return {
    ...profile,
    dimensions,
    updatedAt: nowIso(),
  };
}
