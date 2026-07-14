import type { EditorialInput, RankingScopes } from "./types";

export function deriveRankingScopes(input: EditorialInput): RankingScopes {
  // Consumer-provided scopes take precedence; fall back to world derived from rank/totalRanked.
  const base: RankingScopes = {
    world: { rank: input.rank, total: input.totalRanked },
  };
  return { ...base, ...(input.rankings ?? {}) };
}

export function percentileFromRank(rank: number, total: number): number {
  if (total <= 1 || rank < 1) return 50;
  return Math.max(0, Math.min(100, (1 - (rank - 1) / (total - 1)) * 100));
}
