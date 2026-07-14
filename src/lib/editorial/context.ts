import type { EditorialContext, EditorialInput, EvolutionSummary } from "./types";
import { buildBreakdown } from "./breakdown";
import { buildConfidence } from "./confidence";
import { buildInsights } from "./insights";
import { buildComparison } from "./comparison";
import { findSimilar } from "./similar";
import { deriveRankingScopes, percentileFromRank } from "./rankings";

export function buildEditorialContext(input: EditorialInput): EditorialContext {
  const rankings = deriveRankingScopes(input);
  const percentile = percentileFromRank(input.rank, input.totalRanked);

  const evolution = buildEvolution(input);

  const { slices, top } = buildBreakdown(input.result);
  const confidence = buildConfidence(input.result);

  const partial = {
    score: {
      definition: input.definition,
      value: input.scoreValue,
      grade: input.grade,
      percentile,
      class: input.grade,
    },
    identity: input.identity,
    evolution,
  } as const;

  const insights = buildInsights(input, partial);
  const comparisons = buildComparison(input, partial);
  const similar = findSimilar(input);

  return {
    identity: input.identity,
    score: partial.score,
    rankings,
    breakdown: slices,
    topContributions: top,
    confidence,
    evolution,
    insights,
    comparisons,
    similar,
    seed: `${input.definition.id}::${input.identity.name}::${input.season ?? ""}`,
  };
}

function buildEvolution(input: EditorialInput): EvolutionSummary {
  const history = (input.history ?? []).slice().sort((a, b) => a.season - b.season);
  const current = history.length
    ? history[history.length - 1]
    : { season: input.season ?? 0, score: input.scoreValue, rank: input.rank };
  const previous = history.length >= 2 ? history[history.length - 2] : undefined;
  let bestScore: number | undefined;
  let bestSeason: number | undefined;
  let worstScore: number | undefined;
  let worstSeason: number | undefined;
  for (const p of history) {
    if (bestScore == null || p.score > bestScore) {
      bestScore = p.score;
      bestSeason = p.season;
    }
    if (worstScore == null || p.score < worstScore) {
      worstScore = p.score;
      worstSeason = p.season;
    }
  }
  return {
    currentScore: current.score ?? input.scoreValue,
    previousScore: previous?.score,
    deltaScore: previous ? (current.score ?? input.scoreValue) - previous.score : undefined,
    currentRank: current.rank ?? input.rank,
    previousRank: previous?.rank,
    deltaRank:
      previous?.rank != null && current.rank != null ? current.rank - previous.rank : undefined,
    bestScore,
    bestSeason,
    worstScore,
    worstSeason,
    seasonsTracked: history.length,
  };
}
