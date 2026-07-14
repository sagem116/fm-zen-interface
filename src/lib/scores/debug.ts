import { explainScore } from "./explain";
import { validateScore } from "./validate";
import type { DebugReport, ScoreDefinition, ScoreResult, ValidationResult } from "./types";

const SCORE_SCHEMA_VERSION = "1.0" as const;

interface DebugCatalogs {
  scores: ScoreDefinition[];
  attributes: Set<string>;
  metrics: Set<string>;
  contexts: Set<string>;
  modifiers: Set<string>;
}

export function debugScore(
  result: ScoreResult,
  catalogs: DebugCatalogs,
  validation?: ValidationResult,
): DebugReport {
  const explain = explainScore(result, { scores: catalogs.scores });
  const resolvedValidation =
    validation ??
    validateScore(
      { result },
      {
        attributes: catalogs.attributes,
        metrics: catalogs.metrics,
        contexts: catalogs.contexts,
        modifiers: catalogs.modifiers,
        scores: new Set(catalogs.scores.map((score) => score.id)),
      },
    );

  const summary = {
    scoreId: result.scoreId,
    score: result.score ?? result.value ?? null,
    grade: result.grade,
    confidence: result.confidence?.value,
    attributes: result.components?.attributes.subtotal ?? 0,
    metrics: result.components?.metrics.subtotal ?? 0,
    contexts: result.components?.contexts.subtotal ?? 0,
    modifiers: result.components?.modifiers.subtotal ?? 0,
    warnings: resolvedValidation.warnings.length,
    errors: resolvedValidation.errors.length,
    missing: resolvedValidation.missingInputs.length,
  };

  const text = [
    `${result.scoreId}`,
    "━━━━━━━━━━━━━━━━━━",
    `Final Score: ${summary.score ?? "n/a"}`,
    `Grade: ${summary.grade ?? "n/a"}`,
    `Confidence: ${summary.confidence ?? 0}%`,
    "━━━━━━━━━━━━━━━━━━",
    `Attributes: ${summary.attributes.toFixed(2)}`,
    `Metrics: ${summary.metrics.toFixed(2)}`,
    `Contexts: ${summary.contexts.toFixed(2)}`,
    `Modifiers: ${summary.modifiers.toFixed(2)}`,
    "━━━━━━━━━━━━━━━━━━",
    `Warnings: ${summary.warnings}`,
    `Errors: ${summary.errors}`,
    `Missing: ${summary.missing}`,
  ].join("\n");

  return {
    schemaVersion: SCORE_SCHEMA_VERSION,
    summary,
    explain,
    validation: resolvedValidation,
    text,
    meta: explain.meta,
  };
}
