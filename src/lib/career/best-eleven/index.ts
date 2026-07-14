import type { CareerBestEleven, CareerBestElevenSlot, CareerSeasonId } from "../types";
import { nowIso } from "../utils";

export function createSeasonBestEleven(seasonId: CareerSeasonId): CareerBestEleven {
  return {
    scope: "season",
    seasonId,
    entries: [],
    updatedAt: nowIso(),
  };
}

export function createCareerBestEleven(): CareerBestEleven {
  return {
    scope: "career",
    entries: [],
    updatedAt: nowIso(),
  };
}

export function upsertBestElevenSlot(
  bestEleven: CareerBestEleven,
  slot: CareerBestElevenSlot,
): CareerBestEleven {
  const entries = bestEleven.entries.some((item) => item.position === slot.position)
    ? bestEleven.entries.map((item) => (item.position === slot.position ? slot : item))
    : [...bestEleven.entries, slot];

  return {
    ...bestEleven,
    entries,
    updatedAt: nowIso(),
  };
}
