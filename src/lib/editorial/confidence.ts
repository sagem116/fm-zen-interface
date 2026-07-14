import type { ScoreResult } from "@/lib/scores";
import type { ConfidenceSummary } from "./types";

export function buildConfidence(
  result: ScoreResult | null | undefined,
  extras?: { minutes?: number; matches?: number; seasons?: number },
): ConfidenceSummary {
  const level = result?.confidence?.value ?? 0;
  const coverage = result?.confidence?.breakdown?.totalCoverage;
  return {
    level,
    coverage,
    minutes: extras?.minutes,
    matches: extras?.matches,
    seasons: extras?.seasons,
  };
}
