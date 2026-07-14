import type { ConfidenceInput, ScoreConfidenceResult } from "../types";

function clamp100(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function calculateConfidence(
  input: ConfidenceInput,
  weights: { coverage: number; sample: number },
): ScoreConfidenceResult {
  const availableComponents =
    input.attributes.availableComponents +
    input.metrics.availableComponents +
    input.contexts.availableComponents +
    input.modifiers.availableComponents;

  const totalComponents =
    input.attributes.totalComponents +
    input.metrics.totalComponents +
    input.contexts.totalComponents +
    input.modifiers.totalComponents;

  const totalCoverage = totalComponents === 0 ? 1 : availableComponents / totalComponents;

  const coverages = [
    input.attributes.coverage,
    input.metrics.coverage,
    input.contexts.coverage,
    input.modifiers.coverage,
  ];

  const averageCoverage = coverages.reduce((sum, value) => sum + value, 0) / coverages.length;
  const sampleScore = totalComponents === 0 ? 1 : Math.min(1, totalComponents / 12);

  const weightSum = weights.coverage + weights.sample;
  const confidenceUnit =
    weightSum <= 0
      ? averageCoverage
      : (averageCoverage * weights.coverage + sampleScore * weights.sample) / weightSum;

  return {
    value: clamp100(confidenceUnit * 100),
    breakdown: {
      attributesCoverage: input.attributes.coverage,
      metricsCoverage: input.metrics.coverage,
      contextsCoverage: input.contexts.coverage,
      modifiersCoverage: input.modifiers.coverage,
      totalCoverage,
      availableComponents,
      totalComponents,
    },
  };
}
