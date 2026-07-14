import { defaultAttributes } from "../attributes";
import { defaultContexts } from "../contexts";
import { defaultMetrics } from "../metrics";
import { defaultModifiers } from "../modifiers";
import { defaultScoreDefinitions, defaultScoreProfiles } from "../profiles";
import { createScoreRegistries } from "../registry";
import { loadScoreEngineConfig } from "../config/store";
import { evaluateScore } from "./evaluate";
import { explainScore } from "../explain";
import { validateScore } from "../validate";
import { debugScore } from "../debug";
import type {
  DebugReport,
  EvaluateScoreInput,
  EvaluateScoreOptions,
  ExplainResult,
  ScoreCategoryId,
  ScoreEngine,
  ScoreEngineConfig,
  ScoreEntityKind,
  ScoreId,
  ScoreResult,
  ValidationRequest,
  ValidationResult,
} from "../types";

export interface CreateScoreEngineOptions {
  config?: ScoreEngineConfig;
}

export function createScoreEngine(options: CreateScoreEngineOptions = {}): ScoreEngine {
  const config = options.config ?? loadScoreEngineConfig();
  const registries = createScoreRegistries();

  for (const attribute of defaultAttributes) registries.attributes.register(attribute);
  for (const metric of defaultMetrics) registries.metrics.register(metric);
  for (const context of defaultContexts) registries.contexts.register(context);
  for (const modifier of defaultModifiers) registries.modifiers.register(modifier);
  for (const score of defaultScoreDefinitions) registries.scores.register(score);
  for (const profile of defaultScoreProfiles) registries.scoreProfiles.register(profile);

  const validationCatalogs = {
    attributes: new Set(registries.attributes.list().map((item) => item.id)),
    metrics: new Set(registries.metrics.list().map((item) => item.id)),
    contexts: new Set(registries.contexts.list().map((item) => item.id)),
    modifiers: new Set(registries.modifiers.list().map((item) => item.id)),
    scores: new Set(registries.scores.list().map((item) => item.id)),
  };

  return {
    config,
    registries,
    listAttributes: () => registries.attributes.list(),
    listMetrics: () => registries.metrics.list(),
    listContexts: () => registries.contexts.list(),
    listModifiers: () => registries.modifiers.list(),
    listScores: () => registries.scores.list(),
    getScore: (id: ScoreId) => registries.scores.get(id),
    getScoresByCategory: (categoryId: ScoreCategoryId) =>
      registries.scores.list().filter((score) => score.categoryId === categoryId),
    getScoresByEntityKind: (entityKind: ScoreEntityKind) =>
      registries.scores.list().filter((score) => score.entityKind === entityKind),
    listProfiles: () => registries.scoreProfiles.list(),
    evaluateScore: (input: EvaluateScoreInput, options?: EvaluateScoreOptions) => {
      const scoreDef = input.scoreId ? registries.scores.get(input.scoreId) : undefined;
      const enrichedInput = {
        ...input,
        entityKind: input.entityKind ?? scoreDef?.entityKind,
      };
      return evaluateScore(enrichedInput, config, options);
    },
    explainScore: (result: ScoreResult): ExplainResult =>
      explainScore(result, { scores: registries.scores.list() }),
    validateScore: (input: ValidationRequest): ValidationResult =>
      validateScore(input, validationCatalogs),
    debugScore: (result: ScoreResult): DebugReport =>
      debugScore(result, {
        scores: registries.scores.list(),
        attributes: validationCatalogs.attributes,
        metrics: validationCatalogs.metrics,
        contexts: validationCatalogs.contexts,
        modifiers: validationCatalogs.modifiers,
      }),
  };
}
