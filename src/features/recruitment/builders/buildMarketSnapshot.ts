import type { MarketSnapshot } from "../types/recruitment-models";

export interface BuildMarketSnapshotInput {
  generatedAt?: string;
  playersAvailable: number;
  playersActive: number;
  coachesActive: number;
  competitionsObserved: number;
}

export function buildMarketSnapshot(input: BuildMarketSnapshotInput): MarketSnapshot {
  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    playersAvailable: input.playersAvailable,
    playersActive: input.playersActive,
    coachesActive: input.coachesActive,
    competitionsObserved: input.competitionsObserved,
  };
}
