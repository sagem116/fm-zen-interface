import { createScoreEngine } from "./engine";
import {
  confidenceBreakdown,
  countErrors,
  countMissingInputs,
  countWarnings,
  componentContribution,
  largestNegativeContribution,
  largestPositiveContribution,
} from "./stats";
import type {
  AttributeDefinition,
  ContextDefinition,
  DebugReport,
  EvaluateScoreInput,
  EvaluateScoreOptions,
  ExplainResult,
  MetricDefinition,
  ModifierDefinition,
  ScoreCategoryId,
  ScoreDefinition,
  ScoreEngine,
  ScoreEntityKind,
  ScoreId,
  ScoreProfile,
  ScoreResult,
  ValidationRequest,
  ValidationResult,
} from "./types";

export * from "./types";
export * from "./registry";
export * from "./engine";
export { defaultScoreEngineConfig } from "./config/defaults";
export { loadScoreEngineConfig, saveScoreEngineConfig } from "./config/store";

let sharedEngine: ScoreEngine | null = null;

function getSharedEngine(): ScoreEngine {
  if (!sharedEngine) {
    sharedEngine = createScoreEngine();
  }
  return sharedEngine;
}

export function resetScoreEngine(): void {
  sharedEngine = null;
}

export function listAttributes(): AttributeDefinition[] {
  return getSharedEngine().listAttributes();
}

export function listMetrics(): MetricDefinition[] {
  return getSharedEngine().listMetrics();
}

export function listContexts(): ContextDefinition[] {
  return getSharedEngine().listContexts();
}

export function listModifiers(): ModifierDefinition[] {
  return getSharedEngine().listModifiers();
}

export function listScores(): ScoreDefinition[] {
  return getSharedEngine().listScores();
}

export function getScore(id: ScoreId): ScoreDefinition | undefined {
  return getSharedEngine().getScore(id);
}

export function getScoresByCategory(categoryId: ScoreCategoryId): ScoreDefinition[] {
  return getSharedEngine().getScoresByCategory(categoryId);
}

export function getScoresByEntityKind(entityKind: ScoreEntityKind): ScoreDefinition[] {
  return getSharedEngine().getScoresByEntityKind(entityKind);
}

export function listProfiles(): ScoreProfile[] {
  return getSharedEngine().listProfiles();
}

export function evaluateScore(
  input: EvaluateScoreInput,
  options?: EvaluateScoreOptions,
): ScoreResult {
  return getSharedEngine().evaluateScore(input, options);
}

export function explainScore(result: ScoreResult): ExplainResult {
  return getSharedEngine().explainScore(result);
}

export function validateScore(input: ValidationRequest): ValidationResult {
  return getSharedEngine().validateScore(input);
}

export function debugScore(result: ScoreResult): DebugReport {
  return getSharedEngine().debugScore(result);
}

export {
  countMissingInputs,
  countWarnings,
  countErrors,
  confidenceBreakdown,
  componentContribution,
  largestPositiveContribution,
  largestNegativeContribution,
};
