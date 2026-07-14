import type {
  ScoreDefinition,
  ScoreEntityKind,
  ScoreGradeScale,
  ScoreResult,
  ValidationResult,
  ExplainResult,
  DebugReport,
  NormalizationRule,
} from "@/lib/scores";
import type { DictionaryEntry } from "@/lib/dictionary";

export interface ScoreStudioCatalogs {
  attributes: DictionaryEntry[];
  metrics: DictionaryEntry[];
  contexts: DictionaryEntry[];
  modifiers: DictionaryEntry[];
}

export interface ScoreVersionEntry {
  id: string;
  label: string;
  savedAt: string;
  score: ScoreDefinition;
  note?: string;
  source?: string;
}

export interface StudioScenario {
  id: string;
  name: string;
  values: Record<string, number>;
}

export interface StudioEvaluationBundle {
  result: ScoreResult;
  explain: ExplainResult;
  validation: ValidationResult;
  debug: DebugReport;
}

export interface ScoreStudioState {
  catalogs: ScoreStudioCatalogs;
  scores: ScoreDefinition[];
  selectedScoreId: string;
  selectedScore: ScoreDefinition;
  entityFilter: ScoreEntityKind | "all";
  categoryFilter: string;
  tagFilter: string;
  searchTerm: string;
  favorites: Set<string>;
  versions: Record<string, ScoreVersionEntry[]>;
  gradeScale: ScoreGradeScale;
  globalWeights: {
    attributes: number;
    metrics: number;
    contexts: number;
    modifiers: number;
  };
  normalizationOverrides: Record<string, NormalizationRule>;
  selectedEntityName: string;
  selectedEntityKind: ScoreEntityKind;
  scenarios: StudioScenario[];
  activeScenarioId: string;
  originalScenarioId: string;
  baselineValues: Record<string, number>;
  simulationValues: Record<string, number>;
  originalEvaluation: StudioEvaluationBundle;
  simulationEvaluation: StudioEvaluationBundle;
  selectedVersionIdA: string | null;
  selectedVersionIdB: string | null;
}
