export type RecruitmentEntityKind = "player" | "coach" | "club" | "competition" | "country";

export type ScoutReportStatus = "new" | "watching" | "analysis" | "priority" | "sign" | "archived";

export type ScoutPriority = "low" | "medium" | "high" | "urgent";

export type ScoutObservationType =
  | "observation"
  | "alert"
  | "injury"
  | "evolution"
  | "highlight"
  | "recommendation"
  | "tactical"
  | "psychological";

export interface RecruitmentEntity {
  id: string;
  type: RecruitmentEntityKind;
  name: string;
  country?: string | null;
  club?: string | null;
  competition?: string | null;
  ranking?: number | null;
  score?: number | null;
  profileUrl?: string | null;
  badges?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RecruitmentPlayer extends RecruitmentEntity {
  type: "player";
  position?: string | null;
  age?: number | null;
  marketValue?: number | null;
  ca?: number | null;
  pa?: number | null;
  statistics?: Record<string, number | string | null>;
  attributes?: Record<string, number | string | null>;
  reputation?: number | null;
  currentSeason?: number | null;
}

export interface RecruitmentCoach extends RecruitmentEntity {
  type: "coach";
  role?: string | null;
  age?: number | null;
  currentSeason?: number | null;
}

export interface RecruitmentClub extends RecruitmentEntity {
  type: "club";
  currentSeason?: number | null;
}

export interface RecruitmentCompetition extends RecruitmentEntity {
  type: "competition";
  currentSeason?: number | null;
}

export interface RecruitmentCountry extends RecruitmentEntity {
  type: "country";
  currentSeason?: number | null;
}

export interface RecruitmentEntitiesPayload {
  players: RecruitmentPlayer[];
  coaches: RecruitmentCoach[];
  clubs: RecruitmentClub[];
  competitions: RecruitmentCompetition[];
  countries: RecruitmentCountry[];
  entities: RecruitmentEntity[];
}

export interface RecruitmentContextModel {
  currentSeason?: number | null;
  selectedCompetition?: string | null;
  selectedClub?: string | null;
  selectedCountry?: string | null;
  selectedPosition?: string | null;
  selectedScore?: string | null;
  filters: Record<string, unknown>;
}

export interface RecruitmentTarget {
  id: string;
  kind: RecruitmentEntityKind;
  name: string;
  club?: string | null;
  country?: string | null;
  competition?: string | null;
  age?: number | null;
  score?: number | null;
  tags?: string[];
}

export interface RecruitmentCandidate extends RecruitmentTarget {
  status?: "new" | "tracked" | "shortlisted" | "observed";
  confidence?: number | null;
  lastSeenAt?: string | null;
}

export interface RecruitmentNeed {
  id: string;
  role: string;
  priority: "low" | "medium" | "high" | "undefined";
  description?: string;
}

export interface ScoutObservation {
  id: string;
  entityId: string;
  entityKind: RecruitmentEntityKind;
  title?: string;
  summary: string;
  description?: string;
  type?: ScoutObservationType;
  season?: number | null;
  competition?: string | null;
  club?: string | null;
  tags?: string[];
  attachments?: Array<{ id: string; kind: string; label: string; href?: string }>;
  status?: ScoutReportStatus;
  priority?: ScoutPriority;
  favorite?: boolean;
  createdAt: string;
  updatedAt?: string;
  rating?: number | null;
  author?: string | null;
}

export interface ScoutReport {
  id: string;
  title: string;
  targetId: string;
  entityKind?: RecruitmentEntityKind;
  entityName?: string;
  status?: ScoutReportStatus;
  priority?: ScoutPriority;
  tags?: string[];
  notes?: string;
  timeline?: Array<{ id: string; at: string; message: string; author?: string | null }>;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  summary?: string;
}

export interface RecruitmentBoardItem {
  id: string;
  targetId: string;
  lane: "watchlist" | "in-analysis" | "approved" | "rejected";
  updatedAt: string;
  notes?: string;
}

export interface ReplacementCandidate {
  id: string;
  targetId: string;
  replacedEntityId: string;
  similarity?: number | null;
  rationale?: string;
}

export interface Recommendation {
  id: string;
  targetId: string;
  reason: string;
  confidence?: number | null;
  createdAt: string;
  targetName?: string;
  entityKind?: RecruitmentEntityKind;
  presetId?: string;
  recommendationScore?: number;
  contributions?: Array<{ criterion: string; weight: number; value: number; impact: number }>;
}

export interface Shortlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  itemIds: string[];
}

export interface MarketSnapshot {
  generatedAt: string;
  playersAvailable: number;
  playersActive: number;
  coachesActive: number;
  competitionsObserved: number;
}

export interface RecruitmentKpiTotals {
  players: number;
  coaches: number;
  clubs: number;
  competitions: number;
  seasons: number;
}

export interface RecruitmentDashboardData {
  totals: RecruitmentKpiTotals;
  marketSnapshot: MarketSnapshot;
  favorites: {
    players: RecruitmentTarget[];
    clubs: RecruitmentTarget[];
    coaches: RecruitmentTarget[];
  };
  recentProfiles: {
    players: RecruitmentTarget[];
    clubs: RecruitmentTarget[];
    coaches: RecruitmentTarget[];
  };
  lastUpdatedAt: string | null;
}

export interface RecruitmentKnowledgeProfile {
  id: string;
  entityKind: RecruitmentEntityKind;
  name: string;
  general: {
    id: string;
    type: RecruitmentEntityKind;
    name: string;
    club: string | null;
    country: string | null;
    competition: string | null;
    season: number | null;
  };
  ranking: {
    world: number | null;
    historical: number | null;
    national: number | null;
    position: number | null;
  };
  scores: Record<string, number | null>;
  tactical: {
    compatibilityGlobal: number | null;
    offensive: number | null;
    defensive: number | null;
    technical: number | null;
    physical: number | null;
    mental: number | null;
    radar: Array<{ label: string; value: number }>;
    primaryPosition: string | null;
    secondaryPositions: string[];
    style: string | null;
  };
  intelligence: {
    summary: string | null;
    strengths: string[];
    weaknesses: string[];
    trends: string[];
    development: Array<{ season: number; score: number }>;
    psychological: Array<{ label: string; score: number }>;
    risk: number | null;
    potential: number | null;
    intelligence: number | null;
    consistency: number | null;
    versatility: number | null;
    style: number | null;
  };
  market: {
    age: number | null;
    value: number | null;
    salary: number | null;
    contract: string | null;
    reputation: number | null;
    personality: string | null;
  };
  history: {
    reportIds: string[];
    observationIds: string[];
    timelineIds: string[];
  };
  updatedAt: string;
}

export type RecruitmentScoreCriterionId =
  | "ranking"
  | "scores"
  | "tacticalCompatibility"
  | "psychological"
  | "potential"
  | "age"
  | "value"
  | "salary"
  | "form"
  | "consistency"
  | "versatility"
  | "style"
  | "risk"
  | "intelligence"
  | "history";

export interface RecruitmentScoreCriterionConfig {
  enabled: boolean;
  weight: number;
}

export interface RecruitmentScorePreset {
  id: string;
  name: string;
  description?: string;
  entityKinds: Array<"player" | "coach">;
  scoreSelectionMode: "all" | "selected";
  selectedScoreIds: string[];
  criteria: Record<RecruitmentScoreCriterionId, RecruitmentScoreCriterionConfig>;
  updatedAt: string;
}

export interface RecruitmentScoreSettingsState {
  activePresetId: string;
  presets: RecruitmentScorePreset[];
  updatedAt: string;
}

export interface RecruitmentScoreContribution {
  criterion: string;
  weight: number;
  normalizedWeight: number;
  value: number;
  impact: number;
}

export interface RecruitmentScoreExplanation {
  value: number;
  presetId: string;
  presetName: string;
  contributions: Array<RecruitmentScoreContribution & { impactPercent: number }>;
}

export type RecommendationCriterionId =
  | "ranking"
  | "recruitmentScore"
  | "compatibility"
  | "age"
  | "value"
  | "salary"
  | "potential"
  | "risk"
  | "versatility"
  | "personality"
  | "consistency"
  | "form"
  | "style"
  | "psychological"
  | "scoreOverall"
  | "scorePosition";

export interface RecommendationCriterionConfig {
  enabled: boolean;
  weight: number;
}

export interface RecommendationPreset {
  id: string;
  name: string;
  objective: "player" | "coach";
  criteria: Record<RecommendationCriterionId, RecommendationCriterionConfig>;
}

export interface RecommendationContribution {
  criterion: RecommendationCriterionId;
  label: string;
  weight: number;
  normalizedWeight: number;
  value: number;
  impact: number;
  impactPercent: number;
}

export interface RecommendationExplain {
  recommendationScore: number;
  presetId: string;
  presetName: string;
  contributions: RecommendationContribution[];
  strengths: string[];
  weaknesses: string[];
}
