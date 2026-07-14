/**
 * Score Engine - core types.
 *
 * Phase 1.1 only defines architecture contracts.
 * No score formulas or calculations are implemented.
 */

export interface ScoreCategory {
  id: ScoreCategoryId;
  label?: string;
  description?: string;
}

export type CanonicalId = `${string}.${string}`;
export type AttributeId = `attribute.${string}`;
export type MetricId = `metric.${string}`;
export type ContextId = `context.${string}`;
export type ModifierId = `modifier.${string}`;
export type ScoreId = `score.${string}`;
export type ScoreProfileId = `score_profile.${string}`;
export type ScoreCategoryId = `score_category.${string}`;
export type AttributeCategoryId = `attribute_category.${string}`;
export type MetricCategoryId = `metric_category.${string}`;
export type ContextCategoryId = `context_category.${string}`;
export type ModifierCategoryId = `modifier_category.${string}`;

export type ScoreEntityKind = "player" | "club" | "coach" | "competition" | "country";
export type ScoreSchemaVersion = "1.0";
export type ScoreEngineVersion = string;

export interface DefinitionMetadata {
  name: string;
  abbreviation?: string;
  categoryId: CanonicalId;
  unit?: string;
  description?: string;
  tags?: string[];
  discoverable?: boolean;
  source?: string;
}

export interface AttributeDefinition {
  id: AttributeId;
  categoryId: AttributeCategoryId;
  entityKinds?: ScoreEntityKind[];
  discoverable?: boolean;
  label?: string;
  description?: string;
  metadata?: DefinitionMetadata & Record<string, unknown>;
}

export interface MetricDefinition {
  id: MetricId;
  categoryId: MetricCategoryId;
  entityKinds?: ScoreEntityKind[];
  discoverable?: boolean;
  label?: string;
  description?: string;
  metadata?: DefinitionMetadata & Record<string, unknown>;
}

export interface ContextDefinition {
  id: ContextId;
  categoryId: ContextCategoryId;
  entityKinds?: ScoreEntityKind[];
  discoverable?: boolean;
  label?: string;
  description?: string;
  metadata?: DefinitionMetadata & Record<string, unknown>;
}

export interface ModifierDefinition {
  id: ModifierId;
  categoryId: ModifierCategoryId;
  entityKinds?: ScoreEntityKind[];
  discoverable?: boolean;
  label?: string;
  description?: string;
  metadata?: DefinitionMetadata & Record<string, unknown>;
}

export interface AttributeReference {
  attributeId: AttributeId;
  weight?: number;
}

export interface MetricReference {
  metricId: MetricId;
  weight?: number;
}

export interface ContextReference {
  contextId: ContextId;
  weight?: number;
}

export interface ModifierReference {
  modifierId: ModifierId;
  weight?: number;
}

export interface ScoreDefinition {
  id: ScoreId;
  name: string;
  entityKind: ScoreEntityKind;
  categoryId: ScoreCategoryId;
  description?: string;
  attributeRefs?: AttributeReference[];
  metricRefs?: MetricReference[];
  contextRefs?: ContextReference[];
  modifierRefs?: ModifierReference[];
  profileIds?: ScoreProfileId[];
  version?: string;
  tags?: string[];
  status?: "draft" | "active" | "deprecated";
  metadata?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface ScoreBreakdownItem {
  id: CanonicalId;
  type: "attribute" | "metric" | "context" | "modifier";
  value?: number | null;
  normalizedValue?: number;
  weight?: number;
  normalizedWeight?: number;
  contribution?: number;
  metadata?: Record<string, unknown>;
}

export interface ScoreBreakdownSection {
  id: string;
  label: string;
  subtotal: number;
  items: ScoreBreakdownItem[];
}

export interface ScoreBreakdown {
  score: number;
  baseScore: number;
  modifierAdjustment: number;
  sections: ScoreBreakdownSection[];
  notes?: string[];
}

export type NormalizationKind = "identity" | "range" | "percentage" | "ratio";

export interface BaseNormalizationRule {
  kind: NormalizationKind;
  clamp?: boolean;
  invert?: boolean;
}

export interface IdentityNormalizationRule extends BaseNormalizationRule {
  kind: "identity";
}

export interface RangeNormalizationRule extends BaseNormalizationRule {
  kind: "range";
  min: number;
  max: number;
}

export interface PercentageNormalizationRule extends BaseNormalizationRule {
  kind: "percentage";
  sourceMax?: 1 | 100;
}

export interface RatioNormalizationRule extends BaseNormalizationRule {
  kind: "ratio";
  denominator: number;
}

export type NormalizationRule =
  | IdentityNormalizationRule
  | RangeNormalizationRule
  | PercentageNormalizationRule
  | RatioNormalizationRule;

export interface WeightedInputComponent<Id extends CanonicalId = CanonicalId> {
  id: Id;
  value: number | null | undefined;
  weight?: number;
  normalization?: NormalizationRule;
  metadata?: Record<string, unknown>;
}

export interface NormalizedComponent<Id extends CanonicalId = CanonicalId> {
  id: Id;
  value: number | null;
  normalizedValue: number;
  weight: number;
  normalizedWeight: number;
  contribution: number;
  status?: "used";
  metadata?: Record<string, unknown>;
}

export interface IgnoredComponent<Id extends CanonicalId = CanonicalId> {
  id: Id;
  value: number | null | undefined;
  reason: "missing_value" | "invalid_value";
  metadata?: Record<string, unknown>;
}

export interface WeightedComponentGroupResult<Id extends CanonicalId = CanonicalId> {
  subtotal: number;
  totalWeight: number;
  totalComponents: number;
  availableComponents: number;
  coverage: number;
  components: NormalizedComponent<Id>[];
  ignoredComponents?: IgnoredComponent<Id>[];
}

export interface ScoreResultComponents {
  attributes: WeightedComponentGroupResult<AttributeId>;
  metrics: WeightedComponentGroupResult<MetricId>;
  contexts: WeightedComponentGroupResult<ContextId>;
  modifiers: WeightedComponentGroupResult<ModifierId>;
  baseScore: number;
  modifierAdjustment: number;
}

export interface ScoreConfidenceBreakdown {
  attributesCoverage: number;
  metricsCoverage: number;
  contextsCoverage: number;
  modifiersCoverage: number;
  totalCoverage: number;
  availableComponents: number;
  totalComponents: number;
}

export interface ScoreConfidenceResult {
  value: number;
  breakdown: ScoreConfidenceBreakdown;
}

export interface ScoreGradeThreshold {
  minScore: number;
  grade: string;
}

export interface ScoreGradeScale {
  thresholds: ScoreGradeThreshold[];
  fallbackGrade: string;
}

export interface ScoreResult {
  schemaVersion?: ScoreSchemaVersion;
  scoreId: ScoreId;
  entityId: string;
  status?: "ok" | "not_applicable" | "insufficient_data" | "error";
  score?: number | null;
  value?: number | null;
  grade?: string;
  confidence?: ScoreConfidenceResult;
  components?: ScoreResultComponents;
  breakdown?: ScoreBreakdown;
  computedAt?: string;
  meta?: ScoreResultMeta;
  metadata?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface ScoreResultMeta {
  schemaVersion: ScoreSchemaVersion;
  engineVersion: ScoreEngineVersion;
  generatedAt: string;
  scoreId: ScoreId;
  entityKind: ScoreEntityKind | "unknown";
  entityId: string;
}

export interface ScoreEvidence {
  id: CanonicalId;
  label: string;
  rawValue: number | null;
  normalizedValue: number;
  weight: number;
  contribution: number;
  source?: string;
  unit?: string;
  category?: string;
  status: "used" | "ignored";
}

export interface ExplainTraceStep {
  group: "attributes" | "metrics" | "contexts" | "modifiers";
  id: CanonicalId;
  rawValue: number | null;
  normalizedValue: number;
  weight: number;
  contribution: number;
  status: "used" | "ignored";
}

export interface ExplainResult {
  schemaVersion: ScoreSchemaVersion;
  score: number | null;
  grade?: string;
  confidence?: ScoreConfidenceResult;
  groups: ScoreResultComponents;
  breakdown?: ScoreBreakdown;
  contributions: ScoreEvidence[];
  usedComponents: ScoreEvidence[];
  ignoredComponents: ScoreEvidence[];
  trace: ExplainTraceStep[];
  meta: ScoreResultMeta;
}

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
  id?: CanonicalId | string;
  severity: "warning" | "error";
}

export interface ValidationInput {
  definition?: ScoreDefinition;
  evaluateInput?: EvaluateScoreInput;
  result?: ScoreResult;
}

export type ValidationRequest = ValidationInput | ScoreDefinition;

export interface ValidationResult {
  schemaVersion: ScoreSchemaVersion;
  valid: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  missingInputs: CanonicalId[];
  unusedInputs: CanonicalId[];
  meta: ScoreResultMeta;
}

export interface DebugReport {
  schemaVersion: ScoreSchemaVersion;
  summary: {
    scoreId: ScoreId;
    score: number | null;
    grade?: string;
    confidence?: number;
    attributes: number;
    metrics: number;
    contexts: number;
    modifiers: number;
    warnings: number;
    errors: number;
    missing: number;
  };
  explain: ExplainResult;
  validation: ValidationResult;
  text: string;
  meta: ScoreResultMeta;
}

export interface ScoreProfile {
  id: ScoreProfileId;
  label?: string;
  scoreIds: ScoreId[];
  metadata?: Record<string, unknown>;
}

export interface Registry<T extends { id: string }> {
  register(item: T): void;
  unregister(id: string): void;
  get(id: string): T | undefined;
  list(): T[];
  has(id: string): boolean;
}

export interface AttributeRegistry extends Registry<AttributeDefinition> {}
export interface MetricRegistry extends Registry<MetricDefinition> {}
export interface ContextRegistry extends Registry<ContextDefinition> {}
export interface ModifierRegistry extends Registry<ModifierDefinition> {}
export interface ScoreRegistry extends Registry<ScoreDefinition> {}
export interface ScoreProfileRegistry extends Registry<ScoreProfile> {}

export interface ScoreRegistries {
  attributes: AttributeRegistry;
  metrics: MetricRegistry;
  contexts: ContextRegistry;
  modifiers: ModifierRegistry;
  scores: ScoreRegistry;
  scoreProfiles: ScoreProfileRegistry;
}

export interface ScoreEngineConfig {
  id: string;
  version: string;
  defaultNormalization: NormalizationRule;
  baseGroupWeights: {
    attributes: number;
    metrics: number;
    contexts: number;
  };
  modifierImpact: number;
  confidenceWeights: {
    coverage: number;
    sample: number;
  };
  gradeScale: ScoreGradeScale;
}

export interface EvaluateScoreInput {
  scoreId?: ScoreId;
  entityKind?: ScoreEntityKind;
  entityId?: string;
  attributes?: WeightedInputComponent<AttributeId>[];
  metrics?: WeightedInputComponent<MetricId>[];
  contexts?: WeightedInputComponent<ContextId>[];
  modifiers?: WeightedInputComponent<ModifierId>[];
  now?: Date;
  metadata?: Record<string, unknown>;
}

export interface EvaluateScoreOptions {
  defaultNormalization?: NormalizationRule;
  baseGroupWeights?: {
    attributes?: number;
    metrics?: number;
    contexts?: number;
  };
  modifierImpact?: number;
  confidenceWeights?: {
    coverage?: number;
    sample?: number;
  };
  gradeScale?: ScoreGradeScale;
}

export interface WeightedComponentParams {
  normalizedValue: number;
  normalizedWeight: number;
}

export interface ConfidenceInput {
  attributes: WeightedComponentGroupResult<AttributeId>;
  metrics: WeightedComponentGroupResult<MetricId>;
  contexts: WeightedComponentGroupResult<ContextId>;
  modifiers: WeightedComponentGroupResult<ModifierId>;
}

export interface BreakdownInput {
  score: number;
  baseScore: number;
  modifierAdjustment: number;
  attributes: WeightedComponentGroupResult<AttributeId>;
  metrics: WeightedComponentGroupResult<MetricId>;
  contexts: WeightedComponentGroupResult<ContextId>;
  modifiers: WeightedComponentGroupResult<ModifierId>;
}

export interface ScoreEngine {
  config: ScoreEngineConfig;
  registries: ScoreRegistries;
  listAttributes(): AttributeDefinition[];
  listMetrics(): MetricDefinition[];
  listContexts(): ContextDefinition[];
  listModifiers(): ModifierDefinition[];
  listScores(): ScoreDefinition[];
  getScore(id: ScoreId): ScoreDefinition | undefined;
  getScoresByCategory(categoryId: ScoreCategoryId): ScoreDefinition[];
  getScoresByEntityKind(entityKind: ScoreEntityKind): ScoreDefinition[];
  listProfiles(): ScoreProfile[];
  evaluateScore(input: EvaluateScoreInput, options?: EvaluateScoreOptions): ScoreResult;
  explainScore(result: ScoreResult): ExplainResult;
  validateScore(input: ValidationRequest): ValidationResult;
  debugScore(result: ScoreResult): DebugReport;
}
