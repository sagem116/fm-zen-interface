import type { ExplainResult, ScoreResult, ValidationResult } from "./types";

export function countMissingInputs(result: ValidationResult): number {
  return result.missingInputs.length;
}

export function countWarnings(result: ValidationResult): number {
  return result.warnings.length;
}

export function countErrors(result: ValidationResult): number {
  return result.errors.length;
}

export function confidenceBreakdown(result: ScoreResult): ScoreResult["confidence"] {
  return result.confidence;
}

export function componentContribution(explain: ExplainResult): Record<string, number> {
  return Object.fromEntries(explain.contributions.map((item) => [item.id, item.contribution]));
}

export function largestPositiveContribution(
  explain: ExplainResult,
): ExplainResult["contributions"][number] | undefined {
  return explain.contributions
    .filter((item) => item.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)[0];
}

export function largestNegativeContribution(
  explain: ExplainResult,
): ExplainResult["contributions"][number] | undefined {
  return explain.contributions
    .filter((item) => item.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)[0];
}
