import type { CareerSeasonId, CareerSnapshot, CareerStatisticsGlobal } from "../types";

export function selectCareerStatistics(career: CareerSnapshot): CareerStatisticsGlobal | undefined {
  return career.statistics;
}

export function selectSeasonAssessments(career: CareerSnapshot, seasonId?: CareerSeasonId) {
  if (!seasonId) return career.seasonAssessments;
  return career.seasonAssessments[seasonId];
}

export function selectTransferAssessments(career: CareerSnapshot, seasonId?: CareerSeasonId) {
  if (!seasonId) return career.transferAssessments;
  return career.transferAssessments[seasonId] ?? [];
}
