/**
 * Intelligence Studio — types.
 *
 * The Studio never mutates the Intelligence Engine. It stores an override
 * "profile" (a patch) that is merged with the engine's built-in defaults
 * to produce a live EngineConfig at runtime.
 */
import type { EntityKind, MetricDef, ProfileDef, RuleDef, TraitDef } from "@/lib/intelligence";

/** A single change log entry attached to a StudioProfile. */
export interface ChangeLogEntry {
  at: string; // ISO
  author?: string;
  summary: string;
}

/**
 * Narrative template stored in plain text (Studio-editable).
 * Supported tokens: {name}, {score}, {level}, {group}, {polarity}.
 * The merge layer converts these into engine NarrativeTemplate functions.
 */
export interface StudioNarrativeBucket {
  minScore: number; // 0..1
  text: string;
}
export interface StudioNarrativeTemplate {
  traitId: string;
  buckets: StudioNarrativeBucket[];
}

/**
 * Override profile — declarative patch over the engine defaults.
 * - upsertX: replaces or adds by id.
 * - removedX: ids to remove from the effective config.
 */
export interface StudioProfile {
  id: string; // "studio.profile.<slug>"
  name: string;
  description?: string;
  version: string; // e.g. "1.0.0"
  createdAt: string; // ISO
  updatedAt: string; // ISO
  author?: string;
  changeLog: ChangeLogEntry[];

  upsertRules: RuleDef[];
  upsertTraits: TraitDef[];
  upsertProfiles: ProfileDef[];
  upsertNarratives: StudioNarrativeTemplate[];

  removedRuleIds: string[];
  removedTraitIds: string[];
  removedProfileIds: string[];
  removedNarrativeTraitIds: string[];
}

/** Global UI + engine settings surfaced by the Studio. */
export interface StudioSettings {
  activeProfileId: string; // id of the active StudioProfile
  showEvidence: boolean;
  showConfidence: boolean;
  showPercentiles: boolean;
  showMetrics: boolean;
  onlyStrong: boolean;
  groupByCategory: boolean;
}

/** Serializable envelope for import/export. */
export interface StudioExport {
  kind: "intelligence-studio-export";
  version: 1;
  exportedAt: string;
  settings: StudioSettings;
  profiles: StudioProfile[];
}

/** Convenience façade used by the UI to enumerate discoverable metrics. */
export interface DiscoveredMetric {
  id: string;
  kind: EntityKind;
  label: string;
  unit?: string;
  description?: string;
  discoverable: boolean;
}

export type { MetricDef, RuleDef, TraitDef, ProfileDef, EntityKind };
