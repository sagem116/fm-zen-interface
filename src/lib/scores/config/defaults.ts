import type { ScoreEngineConfig } from "../types";

export const defaultScoreEngineConfig: ScoreEngineConfig = {
  id: "score-engine.default",
  version: "0.1.0",
  defaultNormalization: {
    kind: "range",
    min: 0,
    max: 100,
    clamp: true,
  },
  baseGroupWeights: {
    attributes: 1,
    metrics: 1,
    contexts: 1,
  },
  modifierImpact: 0.2,
  confidenceWeights: {
    coverage: 0.7,
    sample: 0.3,
  },
  gradeScale: {
    thresholds: [
      { minScore: 95, grade: "A+" },
      { minScore: 90, grade: "A" },
      { minScore: 82, grade: "B" },
      { minScore: 70, grade: "C" },
      { minScore: 0, grade: "D" },
    ],
    fallbackGrade: "D",
  },
};
