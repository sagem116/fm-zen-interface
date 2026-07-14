import type { CareerDnaProfile, CareerSeasonId, CareerSnapshot } from "../types";

export function selectCareerDna(career: CareerSnapshot): CareerDnaProfile | undefined {
  return career.dna.career;
}

export function selectSeasonDna(
  career: CareerSnapshot,
  seasonId: CareerSeasonId,
): CareerDnaProfile | undefined {
  return career.dna.bySeason[seasonId];
}

export function selectAllDnaProfiles(career: CareerSnapshot): CareerDnaProfile[] {
  return Object.values(career.dna.bySeason);
}
