/**
 * Intelligence Engine — core types.
 *
 * The engine is completely decoupled from any storage layer.
 * All inputs are plain domain objects supplied by the caller.
 */

export type EntityKind = "club" | "player" | "coach" | "competition" | "country";

// ---------- Domain input shape (abstract, minimal) ----------
// The engine only requires an `id` and `name`. Everything else is
// consumed via metric providers, so callers can pass any extra fields
// they have without the engine needing to know about them.

export interface DomainEntity {
  id: string;
  name: string;
  // Free-form bag of attributes and time series produced by the caller.
  // Metric providers narrow this via their own type parameter.
  [key: string]: unknown;
}

export type Club = DomainEntity;
export type Player = DomainEntity;
export type Coach = DomainEntity;
export type Competition = DomainEntity;
export type Country = DomainEntity;

// ---------- Context ----------
// Precomputed cohort statistics used by rules that need percentiles / z-scores.
// The engine builds it lazily from the pool of entities passed in.

export interface CohortStats {
  count: number;
  values: number[]; // sorted ascending, non-null
  min: number;
  max: number;
  mean: number;
  stddev: number;
  percentile(v: number): number; // 0..1
}

export interface EngineContext {
  kind: EntityKind;
  now: Date;
  // Cohort of all entities of the same kind (needed for percentile-based rules).
  cohort: readonly DomainEntity[];
  // Cached cohort stats per metric id.
  statsFor(metricId: string): CohortStats;
  // Cached raw metric value for any entity in the cohort.
  metricValue(metricId: string, entity: DomainEntity): number | null;
}

// ---------- Metric ----------

export interface MetricDef<E extends DomainEntity = DomainEntity> {
  id: string; // globally unique, e.g. "club.avgAge"
  kind: EntityKind;
  label: string;
  unit?: string;
  description?: string;
  /** Pure function: given the entity and context, return a number or null. */
  compute: (entity: E, ctx: EngineContext) => number | null;
  /** If true, exposed to the future Intelligence Studio for rule authoring. */
  discoverable?: boolean;
}

// ---------- Rule ----------

export type Direction = "higher" | "lower";
export type Normalizer =
  | { kind: "percentile" } // uses cohort percentile
  | { kind: "linear"; min: number; max: number } // clamp+scale to 0..1
  | { kind: "threshold"; at: number; band?: number } // step around a value
  | { kind: "identity" }; // assume metric already 0..1

export interface RuleInputDef {
  metricId: string;
  weight: number; // relative weight; engine normalizes to sum=1
  direction: Direction; // higher-is-better or lower-is-better
  normalize: Normalizer;
}

export type Aggregate = "weightedMean" | "min" | "max";

export interface RuleDef {
  id: string; // e.g. "rule.club.young"
  kind: EntityKind;
  label?: string;
  description?: string;
  aggregate: Aggregate;
  inputs: RuleInputDef[];
}

// ---------- Trait ----------

export interface TraitLevel {
  min: number; // score threshold (0..1)
  label: string; // e.g. "Muito Jovem"
}

export interface TraitDef {
  id: string; // e.g. "trait.club.young"
  kind: EntityKind;
  group: string; // free-form category, e.g. "plantel"
  label: string; // e.g. "Clube Jovem"
  polarity: "positive" | "negative" | "neutral";
  ruleId: string;
  minScore?: number; // below this the trait is not assigned (default 0.5)
  levels?: TraitLevel[]; // sorted ascending by `min`
  description?: string;
}

// ---------- Profile ----------

export interface ProfileDef {
  id: string; // e.g. "profile.club.default"
  kind: EntityKind;
  label: string;
  traitIds: string[]; // traits considered for this profile
  topStrengths?: number; // default 3
  topWeaknesses?: number; // default 3
}

// ---------- Results ----------

export interface Evidence {
  metricId: string;
  metricLabel: string;
  unit?: string;
  rawValue: number | null;
  normalizedValue: number; // 0..1 after normalization + direction
  weight: number; // normalized weight (sums to 1 across inputs)
  contribution: number; // normalizedValue * weight
  normalizer: Normalizer;
}

export interface TraitResult {
  id: string;
  label: string;
  group: string;
  polarity: "positive" | "negative" | "neutral";
  score: number; // 0..100
  confidence: number; // 0..1 — share of inputs with non-null values
  level?: string;
  ruleId: string;
  evidence: Evidence[];
}

export interface NarrativeParagraph {
  text: string;
  refs: string[]; // trait ids the paragraph derives from
}

export interface ProfileResult {
  kind: EntityKind;
  entityId: string;
  entityName: string;
  profileId: string;
  configId: string;
  configName: string;
  configVersion: string;
  generatedAt: string; // ISO
  traits: TraitResult[];
  strengths: TraitResult[];
  weaknesses: TraitResult[];
  narrative: NarrativeParagraph[];
}

// ---------- Configuration ----------

export interface EngineConfig {
  id: string; // e.g. "intelligence.default"
  name: string; // e.g. "Configuração Padrão"
  version: string; // semver-like, e.g. "0.1.0"
  metrics: MetricDef[];
  rules: RuleDef[];
  traits: TraitDef[];
  profiles: ProfileDef[];
  /** Optional narrative templates keyed by trait id. */
  narrativeTemplates?: Record<string, NarrativeTemplate>;
}

export interface NarrativeTemplate {
  /** Templates picked based on score bucket. */
  buckets: Array<{
    minScore: number; // 0..1
    text: (ctx: NarrativeCtx) => string;
  }>;
}

export interface NarrativeCtx {
  entity: DomainEntity;
  trait: TraitResult;
  evidence: Evidence[];
}
