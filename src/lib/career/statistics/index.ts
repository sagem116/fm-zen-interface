import type {
  CareerRecord,
  CareerSeasonAssessmentBundle,
  CareerSeasonAssessmentEntry,
  CareerSeasonAssessmentType,
  CareerSeasonId,
  CareerStatisticsGlobal,
  CareerTransferAssessment,
  CareerTransferAssessmentLabel,
} from "../types";
import { nowIso, toRecordId } from "../utils";

export function createEmptyCareerStatistics(): CareerStatisticsGlobal {
  return {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    titles: 0,
    points: 0,
    averages: {},
    percentages: {},
    updatedAt: nowIso(),
  };
}

export function createSeasonAssessmentBundle(
  seasonId: CareerSeasonId,
): CareerSeasonAssessmentBundle {
  return {
    seasonId,
    entries: [],
    updatedAt: nowIso(),
  };
}

export function createSeasonAssessmentEntry(input: {
  type: CareerSeasonAssessmentType;
  title: string;
  body: string;
  rating?: number;
}): CareerSeasonAssessmentEntry {
  return {
    type: input.type,
    title: input.title,
    body: input.body,
    rating: input.rating,
  };
}

export function createTransferAssessment(input: {
  seasonId: CareerSeasonId;
  playerName: string;
  club: string;
  label: CareerTransferAssessmentLabel;
  value?: number;
  notes?: string;
}): CareerTransferAssessment {
  return {
    id: `career_transfer.${Math.random().toString(36).slice(2, 10)}`,
    seasonId: input.seasonId,
    playerName: input.playerName,
    club: input.club,
    label: input.label,
    value: input.value,
    notes: input.notes,
    createdAt: nowIso(),
  };
}

export function createCareerRecord(input: {
  key: string;
  label: string;
  value: string;
  season?: number;
  context?: string;
}): CareerRecord {
  return {
    id: toRecordId(),
    key: input.key,
    label: input.label,
    value: input.value,
    season: input.season,
    context: input.context,
    updatedAt: nowIso(),
  };
}
