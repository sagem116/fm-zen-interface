import type { CareerHallOfFameEntry, CareerHallOfFameGroup } from "../types";
import { nowIso } from "../utils";

export function createHallOfFameEntry(input: {
  id?: string;
  group: CareerHallOfFameGroup;
  entityName: string;
  notes?: string;
  metrics?: Record<string, number>;
  seasons?: number[];
}): CareerHallOfFameEntry {
  return {
    id: input.id ?? `career_hof.${Math.random().toString(36).slice(2, 10)}`,
    group: input.group,
    entityName: input.entityName,
    notes: input.notes,
    metrics: input.metrics,
    seasons: input.seasons ?? [],
    updatedAt: nowIso(),
  };
}

export function upsertHallOfFameEntry(
  entries: CareerHallOfFameEntry[],
  entry: CareerHallOfFameEntry,
): CareerHallOfFameEntry[] {
  if (entries.some((item) => item.id === entry.id)) {
    return entries.map((item) => (item.id === entry.id ? entry : item));
  }
  return [...entries, entry];
}
