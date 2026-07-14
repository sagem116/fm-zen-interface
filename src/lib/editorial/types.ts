/**
 * Editorial Layer — transverse types.
 *
 * Reusable across: Score Rankings, Player/Club/Competition/Country Profiles,
 * Career Center, Yearbooks, End-of-Season Magazine, Hall of Fame, Dashboards.
 *
 * Deterministic. No LLM. No new engine calls. Consumes only existing data.
 *
 * A single editorial language (templates, tone picker, composition rules)
 * shared across the platform, but each module contributes its own domain
 * context and selects a `NarrativePreset` that produces a distinct story.
 */

import type { ScoreDefinition, ScoreEntityKind, ScoreResult } from "@/lib/scores";

export type EditorialLevel = "mini" | "standard" | "editorial";

/**
 * A preset drives the *questions the module answers*:
 *
 *   rankings      → "Quem está melhor neste momento?"
 *   player        → biographical arc, trajectory, status
 *   club          → institutional cycles, dominant eras
 *   competition   → strength evolution, representativeness
 *   country       → talent ecosystem, generations
 *   coach         → career, cycles, legacy
 *   hallOfFame    → longevity, dominance, legacy
 *   careerCenter  → season magazine, highlights, storyline
 */
export type NarrativePreset =
  | "rankings"
  | "player"
  | "club"
  | "competition"
  | "country"
  | "coach"
  | "hallOfFame"
  | "careerCenter"
  | "explain";

export interface RankingScopes {
  world?: { rank: number; total: number };
  continental?: { rank: number; total: number; continent?: string };
  national?: { rank: number; total: number; country?: string };
  competition?: { rank: number; total: number; competition?: string };
  club?: { rank: number; total: number; club?: string };
}

export interface EntityIdentity {
  name: string;
  kind: ScoreEntityKind;
  photoUrl?: string;
  club?: string;
  country?: string;
  competition?: string;
  continent?: string;
  role?: string;
  age?: number;
  nationality?: string;
  type?: string; // for competitions: league/cup/continental
  foot?: string;
  height?: number;
}

export interface BreakdownSlice {
  section: "attributes" | "metrics" | "contexts" | "modifiers";
  label: string;
  subtotal: number;
  share: number;
  top: BreakdownContribution[];
}

export interface BreakdownContribution {
  id: string;
  label: string;
  contribution: number;
  weight: number;
  section: BreakdownSlice["section"];
}

export interface ConfidenceSummary {
  level: number;
  minutes?: number;
  matches?: number;
  seasons?: number;
  coverage?: number;
}

export interface EvolutionSummary {
  currentScore: number;
  previousScore?: number;
  deltaScore?: number;
  currentRank?: number;
  previousRank?: number;
  deltaRank?: number;
  bestScore?: number;
  bestSeason?: number;
  worstScore?: number;
  worstSeason?: number;
  seasonsTracked: number;
}

/* --------------------------------------------------------------------- *
 * Domain-specific optional contexts.                                    *
 * Each preset consumes a subset. All fields are optional — presets      *
 * fall back to the shared editorial context when unavailable.           *
 * --------------------------------------------------------------------- */

export interface CareerContext {
  seasons: number;
  clubs?: string[];
  titles?: number;
  awards?: number;
  peakSeason?: number;
  peakScore?: number;
  debutSeason?: number;
  phase?: "emerging" | "ascending" | "peak" | "veteran" | "legacy";
  standoutSeasons?: { season: number; score: number; note?: string }[];
}

export interface InstitutionContext {
  foundedEra?: string;
  dominantEras?: { fromSeason: number; toSeason: number; label?: string }[];
  titles?: number;
  continentalTitles?: number;
  cyclePhase?: "rise" | "peak" | "decline" | "stable" | "rebuild";
  bestSeason?: number;
  bestRank?: number;
}

export interface CompetitionProfileContext {
  avgStrength?: number;
  strengthTrend?: "rising" | "stable" | "declining";
  topClubs?: string[];
  seasonsTracked?: number;
  internationalPresence?: number;
  competitionKind?: string;
}

export interface EcosystemContext {
  talentProduction?: number;
  avgQuality?: number;
  qualityTrend?: "rising" | "stable" | "declining";
  clubs?: number;
  competitions?: number;
  standoutPlayers?: string[];
  generationLabel?: string;
}

export interface LegacyContext {
  longevitySeasons?: number;
  dominance?: number; // 0..1
  era?: string;
  records?: string[];
  peakRank?: number;
  hallOfFameYear?: number;
}

export interface SeasonStoryContext {
  season: number;
  moments?: {
    id: string;
    label: string;
    kind?: "trophy" | "record" | "milestone" | "transfer" | "note";
  }[];
  highlights?: string[];
  trophies?: string[];
  headline?: string;
  club?: string;
  competition?: string;
}

export interface InsightCard {
  id: string;
  kind:
    | "top10-entry"
    | "top1"
    | "top01"
    | "best-young"
    | "best-veteran"
    | "biggest-rise"
    | "biggest-fall"
    | "best-signing"
    | "revelation"
    | "best-of-club"
    | "best-of-competition"
    | "best-of-country"
    | "best-of-continent"
    | "best-of-world"
    | "consistency"
    | "longevity";
  title: string;
  description: string;
  tone: "positive" | "neutral" | "warning";
}

export type ComparisonKind =
  | "percentile"
  | "best-of-club"
  | "best-of-competition"
  | "best-of-country"
  | "best-of-continent"
  | "best-of-world"
  | "top10-entry"
  | "biggest-rise"
  | "biggest-fall"
  | "best-young"
  | "best-veteran"
  | "best-season-of-career"
  | "biggest-evolution"
  | "career-peak";

export interface ComparisonFact {
  id: string;
  kind: ComparisonKind;
  text: string;
}

export interface SimilarEntity {
  name: string;
  score: number;
  grade?: string;
  distance: number;
}

export type NarrativeBlockId =
  | "opening"
  | "positioning"
  | "drivers"
  | "strengths"
  | "weaknesses"
  | "context"
  | "evolution"
  | "trajectory"
  | "cycle"
  | "ecosystem"
  | "legacy"
  | "season-story"
  | "closing";

export interface NarrativeBlock {
  id: NarrativeBlockId;
  text: string;
  level: EditorialLevel;
  refs?: string[];
}

/**
 * Fully-derived context that every editorial component consumes.
 */
export interface EditorialContext {
  identity: EntityIdentity;
  score: {
    definition: ScoreDefinition;
    value: number;
    grade?: string;
    percentile: number;
    class?: string;
  };
  rankings: RankingScopes;
  breakdown: BreakdownSlice[];
  topContributions: BreakdownContribution[];
  confidence: ConfidenceSummary;
  evolution: EvolutionSummary;
  insights: InsightCard[];
  comparisons: ComparisonFact[];
  similar: SimilarEntity[];
  /** Domain-specific extensions — populated by module builders. */
  career?: CareerContext;
  institution?: InstitutionContext;
  competitionProfile?: CompetitionProfileContext;
  ecosystem?: EcosystemContext;
  legacy?: LegacyContext;
  seasonStory?: SeasonStoryContext;
  /** Deterministic seed for tone variation. */
  seed: string;
}

export interface EditorialInput {
  identity: EntityIdentity;
  definition: ScoreDefinition;
  result?: ScoreResult | null;
  scoreValue: number;
  grade?: string;
  rank: number;
  totalRanked: number;
  rankings?: RankingScopes;
  history?: { season: number; score: number; rank?: number }[];
  season?: number;
  peers?: { name: string; score: number; grade?: string; components?: number[] }[];
  flags?: {
    bestOfClub?: boolean;
    bestOfCompetition?: boolean;
    bestOfCountry?: boolean;
    bestOfContinent?: boolean;
    bestOfWorld?: boolean;
  };
  /** Optional domain extensions passed straight through by module builders. */
  career?: CareerContext;
  institution?: InstitutionContext;
  competitionProfile?: CompetitionProfileContext;
  ecosystem?: EcosystemContext;
  legacy?: LegacyContext;
  seasonStory?: SeasonStoryContext;
}
