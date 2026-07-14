// Profile Tab Registry — the plugin surface.
// Adding a new module = create a tab component and call `registerProfileTab(def)`.
// ProfileShell/ProfileTabs never need edits when new modules land.

import type { ProfileEntityKind, ProfileTabDef } from "@/lib/profile/types";

const registry = new Map<string, ProfileTabDef>();

/**
 * Register (or replace) a profile tab. Idempotent: safe to call at module load.
 * Later registrations with the same id override earlier ones — useful when a
 * future module wants to enrich an existing tab.
 */
export function registerProfileTab(def: ProfileTabDef): void {
  registry.set(def.id, def);
}

export function unregisterProfileTab(id: string): void {
  registry.delete(id);
}

export function getAllProfileTabs(): ProfileTabDef[] {
  return [...registry.values()].sort((a, b) => a.order - b.order);
}

export function getProfileTabs(kind: ProfileEntityKind): ProfileTabDef[] {
  return getAllProfileTabs().filter((t) => t.kinds.includes(kind));
}

/** Default ordering slots. Leave 100-step gaps so new modules can slot in. */
export const ORDER = {
  SUMMARY: 100,
  INTELLIGENT: 200,
  RANKINGS: 300,
  STATS: 400,
  INSIGHTS: 500,
  EXPLAIN: 600,
  EVOLUTION: 700,
  COMPARE: 800,
  TIMELINE: 900,
  HALL_OF_FAME: 1000,
  RELATED: 1100,
  SCORES: 1200,
  // Future: SCORES=1200, SCOUTING=1300, MARKET=1400, TRANSFERS=1500,
  //         FINANCE=1600, CONTRACTS=1700, STAFF=1800, ACADEMY=1900, ...
} as const;
