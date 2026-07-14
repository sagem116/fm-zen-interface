import type {
  DebugReport,
  ExplainResult,
  ScoreDefinition,
  ScoreEntityKind,
  ScoreResult,
  ValidationResult,
} from "@/lib/scores";

export interface ScoreEvaluationEntry {
  entityName: string;
  score: number;
  grade: string;
  confidence: number;
  result: ScoreResult;
  explain: ExplainResult;
  validation: ValidationResult;
  debug: DebugReport;
}

export interface ScoreHistoryPoint {
  season: number;
  score: number;
  grade: string;
  confidence: number;
}

export interface ScoreComponentView {
  id: string;
  weight: number;
  type: "attribute" | "metric" | "context" | "modifier";
}

export interface ScoreProfileViewModel {
  definition: ScoreDefinition;
  formula: string;
  components: ScoreComponentView[];
}

export interface ScoresFilters {
  search: string;
  entityKind: ScoreEntityKind | "all";
  category: string | "all";
  tag: string | "all";
  status: "all" | "draft" | "active" | "deprecated";
  favoritesOnly: boolean;
}

export interface ScoresCompareState {
  left: string;
  right: string;
}
