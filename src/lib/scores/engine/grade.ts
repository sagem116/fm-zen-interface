import type { ScoreGradeScale } from "../types";

export function calculateGrade(score: number, scale: ScoreGradeScale): string {
  const ordered = [...scale.thresholds].sort((a, b) => b.minScore - a.minScore);
  for (const threshold of ordered) {
    if (score >= threshold.minScore) {
      return threshold.grade;
    }
  }
  return scale.fallbackGrade;
}
