// Backwards-compat re-export. New consumers should import from
// `@/components/score-story` directly.
export { ScoreIdentityCard } from "@/components/score-story/ScoreIdentityCard";

// Legacy adapter kept for callers that still build a lightweight identity
// payload without an EditorialContext. New code should build an
// EditorialContext via `buildEditorialContext` from `@/lib/editorial`.
import type { ScoreEntityKind } from "@/lib/scores";
import type { ScoreEvaluationEntry } from "@/components/scores/types";

export interface ScoreIdentityCardData {
  entityName: string;
  entityKind: ScoreEntityKind;
  photoUrl?: string;
  club?: string;
  country?: string;
  competition?: string;
  role?: string;
  score?: number;
  rank?: number;
  totalRanked?: number;
  percentile?: number;
  grade?: string;
}

export function identityFromEvaluation(
  entry: ScoreEvaluationEntry,
  entityKind: ScoreEntityKind,
  totalRanked: number,
  rank: number,
  extras?: Partial<ScoreIdentityCardData>,
): ScoreIdentityCardData {
  return {
    entityName: entry.entityName,
    entityKind,
    score: entry.score,
    grade: entry.grade,
    rank,
    totalRanked,
    percentile:
      totalRanked > 1 ? Math.max(0, Math.min(100, (1 - (rank - 1) / (totalRanked - 1)) * 100)) : 50,
    ...extras,
  };
}
