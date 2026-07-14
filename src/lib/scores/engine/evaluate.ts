import { calculateBreakdown } from "./breakdown";
import { calculateConfidence } from "./confidence";
import { calculateGrade } from "./grade";
import { calculateWeightedGroup } from "./weights";
import type {
  EvaluateScoreInput,
  EvaluateScoreOptions,
  ScoreEngineConfig,
  ScoreResult,
  ScoreResultMeta,
  WeightedComponentGroupResult,
} from "../types";

const SCORE_SCHEMA_VERSION = "1.0" as const;
const SCORE_ENGINE_VERSION = "1.0";

function clamp100(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function calculateBaseScore(
  groups: {
    attributes: WeightedComponentGroupResult;
    metrics: WeightedComponentGroupResult;
    contexts: WeightedComponentGroupResult;
  },
  weights: { attributes: number; metrics: number; contexts: number },
): number {
  const validWeights = {
    attributes: weights.attributes > 0 ? weights.attributes : 0,
    metrics: weights.metrics > 0 ? weights.metrics : 0,
    contexts: weights.contexts > 0 ? weights.contexts : 0,
  };

  const weightSum = validWeights.attributes + validWeights.metrics + validWeights.contexts;
  if (weightSum <= 0) {
    return 0;
  }

  return (
    groups.attributes.subtotal * (validWeights.attributes / weightSum) +
    groups.metrics.subtotal * (validWeights.metrics / weightSum) +
    groups.contexts.subtotal * (validWeights.contexts / weightSum)
  );
}

function resolveOptions(config: ScoreEngineConfig, options?: EvaluateScoreOptions) {
  return {
    defaultNormalization: options?.defaultNormalization ?? config.defaultNormalization,
    baseGroupWeights: {
      attributes: options?.baseGroupWeights?.attributes ?? config.baseGroupWeights.attributes,
      metrics: options?.baseGroupWeights?.metrics ?? config.baseGroupWeights.metrics,
      contexts: options?.baseGroupWeights?.contexts ?? config.baseGroupWeights.contexts,
    },
    modifierImpact: options?.modifierImpact ?? config.modifierImpact,
    confidenceWeights: {
      coverage: options?.confidenceWeights?.coverage ?? config.confidenceWeights.coverage,
      sample: options?.confidenceWeights?.sample ?? config.confidenceWeights.sample,
    },
    gradeScale: options?.gradeScale ?? config.gradeScale,
  };
}

export function evaluateScore(
  input: EvaluateScoreInput,
  config: ScoreEngineConfig,
  options?: EvaluateScoreOptions,
): ScoreResult {
  const resolved = resolveOptions(config, options);

  const attributes = calculateWeightedGroup({
    components: input.attributes ?? [],
    defaultNormalization: resolved.defaultNormalization,
  });
  const metrics = calculateWeightedGroup({
    components: input.metrics ?? [],
    defaultNormalization: resolved.defaultNormalization,
  });
  const contexts = calculateWeightedGroup({
    components: input.contexts ?? [],
    defaultNormalization: resolved.defaultNormalization,
  });
  const modifiers = calculateWeightedGroup({
    components: input.modifiers ?? [],
    defaultNormalization: resolved.defaultNormalization,
  });

  const baseScore = calculateBaseScore(
    { attributes, metrics, contexts },
    resolved.baseGroupWeights,
  );

  const modifierAdjustment = (modifiers.subtotal - 50) * resolved.modifierImpact;
  const score = clamp100(baseScore + modifierAdjustment);

  const confidence = calculateConfidence(
    { attributes, metrics, contexts, modifiers },
    resolved.confidenceWeights,
  );

  const grade = calculateGrade(score, resolved.gradeScale);
  const breakdown = calculateBreakdown({
    score,
    baseScore,
    modifierAdjustment,
    attributes,
    metrics,
    contexts,
    modifiers,
  });

  const generatedAt = input.now?.toISOString() ?? new Date().toISOString();
  const meta: ScoreResultMeta = {
    schemaVersion: SCORE_SCHEMA_VERSION,
    engineVersion: SCORE_ENGINE_VERSION,
    generatedAt,
    scoreId: input.scoreId ?? "score.generic",
    entityKind: input.entityKind ?? "unknown",
    entityId: input.entityId ?? "entity.generic",
  };

  return {
    schemaVersion: SCORE_SCHEMA_VERSION,
    scoreId: meta.scoreId,
    entityId: meta.entityId,
    status: "ok",
    score,
    value: score,
    grade,
    confidence,
    components: {
      attributes,
      metrics,
      contexts,
      modifiers,
      baseScore,
      modifierAdjustment,
    },
    breakdown,
    computedAt: generatedAt,
    meta,
    metadata: input.metadata,
  };
}
