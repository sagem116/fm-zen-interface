import type {
  CareerAchievement,
  CareerAttachment,
  CareerBestEleven,
  CareerDnaProfile,
  CareerHallOfFameEntry,
  CareerId,
  CareerPreferenceBucket,
  CareerPreferenceCategory,
  CareerSeason,
  CareerSeasonId,
  CareerSeasonJournal,
  CareerSnapshot,
  CareerStatisticsGlobal,
  CareerTimelineEntry,
  CareerTrophy,
} from "../types";
import { getCareerRepository } from "../runtime";
import {
  selectActiveCareer,
  selectCareerById,
  selectCurrentSeason,
  selectSeasonByNumber,
  selectAllSeasons,
  selectSeasonMuseum,
  selectCareerDna,
  selectCareerStatistics,
} from "../selectors";

function resolveCareer(careerId?: CareerId): CareerSnapshot | undefined {
  const snapshot = getCareerRepository().getStoreSnapshot();
  if (careerId) return selectCareerById(snapshot, careerId);
  return selectActiveCareer(snapshot);
}

export function getCareer(careerId?: CareerId): CareerSnapshot | undefined {
  return resolveCareer(careerId);
}

export function getSeason(season: number, careerId?: CareerId): CareerSeason | undefined {
  const career = resolveCareer(careerId);
  if (!career) return undefined;
  return selectSeasonByNumber(career, season);
}

export function getAllSeasons(careerId?: CareerId): CareerSeason[] {
  const career = resolveCareer(careerId);
  if (!career) return [];
  return selectAllSeasons(career);
}

export function getCurrentSeason(careerId?: CareerId): CareerSeason | undefined {
  const career = resolveCareer(careerId);
  if (!career) return undefined;
  return selectCurrentSeason(career);
}

export function getCareerTimeline(careerId?: CareerId): CareerTimelineEntry[] {
  return resolveCareer(careerId)?.timeline ?? [];
}

export function getCareerStatistics(careerId?: CareerId): CareerStatisticsGlobal | undefined {
  const career = resolveCareer(careerId);
  if (!career) return undefined;
  return selectCareerStatistics(career);
}

export function getCareerDNA(careerId?: CareerId): CareerDnaProfile | undefined {
  const career = resolveCareer(careerId);
  if (!career) return undefined;
  return selectCareerDna(career);
}

export function getCareerPreferences(
  careerId?: CareerId,
): Record<CareerPreferenceCategory, CareerPreferenceBucket> | undefined {
  return resolveCareer(careerId)?.preferences;
}

export function getCareerMuseum(seasonId?: CareerSeasonId, careerId?: CareerId) {
  const career = resolveCareer(careerId);
  if (!career) return undefined;
  const resolvedSeasonId = seasonId ?? career.currentSeasonId;
  if (!resolvedSeasonId) return undefined;
  return selectSeasonMuseum(career, resolvedSeasonId);
}

export function getCareerJournal(
  seasonId?: CareerSeasonId,
  careerId?: CareerId,
): CareerSeasonJournal | undefined {
  const career = resolveCareer(careerId);
  if (!career) return undefined;
  const resolvedSeasonId = seasonId ?? career.currentSeasonId;
  if (!resolvedSeasonId) return undefined;
  return career.journals[resolvedSeasonId];
}

export function getCareerBestXI(
  careerId?: CareerId,
): { bySeason: Record<CareerSeasonId, CareerBestEleven>; career?: CareerBestEleven } | undefined {
  return resolveCareer(careerId)?.bestElevens;
}

export function getCareerHallOfFame(careerId?: CareerId): CareerHallOfFameEntry[] {
  return resolveCareer(careerId)?.hallOfFame ?? [];
}

export function getCareerAchievements(
  seasonId?: CareerSeasonId,
  careerId?: CareerId,
): CareerAchievement[] {
  const career = resolveCareer(careerId);
  if (!career) return [];
  const list = Object.values(career.achievements);
  if (!seasonId) return list;
  return list.filter((item) => item.seasonId === seasonId);
}

export function getCareerTrophies(seasonId?: CareerSeasonId, careerId?: CareerId): CareerTrophy[] {
  const career = resolveCareer(careerId);
  if (!career) return [];
  const list = Object.values(career.trophies);
  if (!seasonId) return list;
  return list.filter((item) => item.seasonId === seasonId);
}

export function getCareerAttachments(
  seasonId?: CareerSeasonId,
  careerId?: CareerId,
): CareerAttachment[] {
  const career = resolveCareer(careerId);
  if (!career) return [];
  const list = Object.values(career.attachments);
  if (!seasonId) return list;
  return list.filter((item) => item.seasonId === seasonId);
}
