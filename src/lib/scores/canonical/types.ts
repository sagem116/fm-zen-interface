/**
 * Canonical (Human / AI Friendly) Score format.
 *
 * Uses readable names instead of internal IDs. Meant to be the recommended
 * format for sharing Scores between users and for generation via AI.
 *
 * Conversion to/from the internal ScoreDefinition happens in `toInternal.ts`
 * and `fromInternal.ts`. The Score Engine itself is never modified.
 */
import type { ScoreEntityKind } from "../types";

export interface CanonicalWeightedRef {
  name: string;
  weight: number;
}

export interface CanonicalScore {
  name: string;
  entity: ScoreEntityKind;
  category?: string;
  description?: string;
  tags?: string[];
  attributes?: CanonicalWeightedRef[];
  metrics?: CanonicalWeightedRef[];
  contexts?: CanonicalWeightedRef[];
  modifiers?: CanonicalWeightedRef[];
}

export interface CanonicalScoreDocument {
  format: "canonical-score";
  version: 1;
  scores: CanonicalScore[];
}

export type CanonicalRefKind = "attribute" | "metric" | "context" | "modifier";

export interface ResolutionCandidate {
  id: string;
  label: string;
  score: number; // 0..1 confidence
}

export interface ResolvedRef {
  kind: CanonicalRefKind;
  input: string;
  weight: number;
  status: "resolved" | "ambiguous" | "unknown";
  matchedId?: string;
  matchedLabel?: string;
  candidates: ResolutionCandidate[];
}

export interface ResolutionReport {
  scoreName: string;
  entity: ScoreEntityKind;
  refs: ResolvedRef[];
  resolvedCount: number;
  ambiguousCount: number;
  unknownCount: number;
}
