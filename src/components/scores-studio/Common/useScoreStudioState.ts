import { useEffect, useMemo, useState } from "react";
import { debugScore, evaluateScore, explainScore, listScores, validateScore } from "@/lib/scores";
import type {
  EvaluateScoreInput,
  NormalizationRule,
  ScoreDefinition,
  ScoreEntityKind,
  ScoreGradeScale,
  ScoreId,
} from "@/lib/scores";
import { listDictionaryEntries } from "@/lib/dictionary";
import type { DictionaryEntry } from "@/lib/dictionary";
import type {
  ScoreStudioState,
  ScoreVersionEntry,
  StudioEvaluationBundle,
  StudioScenario,
} from "./types";

const STORAGE_KEY = "score-studio.state.v1";
const BASE_SCORES = listScores();

const ENTITY_OPTIONS: Record<ScoreEntityKind, string[]> = {
  player: ["Cristiano Ronaldo", "Lamine Yamal", "Jude Bellingham", "Kylian Mbappe"],
  coach: ["Pep Guardiola", "Carlo Ancelotti", "Ruben Amorim", "Simone Inzaghi"],
  club: ["Benfica", "Real Madrid", "Manchester City", "Inter"],
  competition: ["Premier League", "Liga Portugal", "Serie A", "LaLiga"],
  country: ["Portugal", "Spain", "Brazil", "Argentina"],
};

export function getEntityOptions(kind: ScoreEntityKind): string[] {
  return [...(ENTITY_OPTIONS[kind] ?? [])];
}

const DEFAULT_GRADE_SCALE: ScoreGradeScale = {
  thresholds: [
    { minScore: 95, grade: "S" },
    { minScore: 90, grade: "A+" },
    { minScore: 85, grade: "A" },
    { minScore: 80, grade: "B+" },
    { minScore: 70, grade: "B" },
    { minScore: 60, grade: "C" },
    { minScore: 45, grade: "D" },
    { minScore: 0, grade: "F" },
  ],
  fallbackGrade: "F",
};

type StudioPersistedState = {
  version: 1;
  scores: ScoreDefinition[];
  selectedScoreId: string;
  entityFilter: ScoreEntityKind | "all";
  categoryFilter: string;
  tagFilter: string;
  searchTerm: string;
  favorites: string[];
  versions: Record<string, ScoreVersionEntry[]>;
  gradeScale: ScoreGradeScale;
  globalWeights: {
    attributes: number;
    metrics: number;
    contexts: number;
    modifiers: number;
  };
  normalizationOverrides: Record<string, NormalizationRule>;
  scenarios: StudioScenario[];
  activeScenarioId: string;
  selectedEntityKind: ScoreEntityKind;
  selectedEntityName: string;
  selectedVersionIdA: string | null;
  selectedVersionIdB: string | null;
};

function makeId(prefix: string): string {
  return `${prefix}.${Math.random().toString(36).slice(2, 9)}`;
}

function readPersistedState(): StudioPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioPersistedState>;
    if (!parsed || parsed.version !== 1) return null;
    return parsed as StudioPersistedState;
  } catch {
    return null;
  }
}

function buildDictionaryCatalogs(): ScoreStudioState["catalogs"] {
  const entries = listDictionaryEntries();
  const sortByLabel = (items: DictionaryEntry[]) =>
    [...items].sort((a, b) => (a.abbreviation ?? a.name).localeCompare(b.abbreviation ?? b.name));

  return {
    attributes: sortByLabel(entries.filter((entry) => entry.category === "attribute")),
    metrics: sortByLabel(entries.filter((entry) => entry.category === "metric")),
    contexts: sortByLabel(entries.filter((entry) => entry.category === "context")),
    modifiers: sortByLabel(entries.filter((entry) => entry.category === "modifier")),
  };
}

function scoreTagList(score: ScoreDefinition): string[] {
  return (score.tags ?? []).map((tag) => tag.toLowerCase());
}

function defaultValueForId(id: string): number {
  if (id.startsWith("attribute.")) return 12;
  if (id.startsWith("metric.")) return 50;
  if (id.startsWith("context.")) return 60;
  if (id.startsWith("modifier.")) return 50;
  return 50;
}

function clampById(id: string, value: number): number {
  if (id.startsWith("attribute.")) return Math.min(20, Math.max(1, value));
  return Math.min(100, Math.max(0, value));
}

function titleCase(value: string): string {
  return value
    .replace(/^score\./, "")
    .replace(/[_.-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function baseScore(score: ScoreDefinition | undefined): ScoreDefinition {
  return (
    score ?? {
      id: "score.generic",
      name: "Generic Score",
      entityKind: "player",
      categoryId: "score_category.player_forward",
    }
  );
}

function buildScenarioValues(score: ScoreDefinition): Record<string, number> {
  const ids = [
    ...(score.attributeRefs ?? []).map((item) => item.attributeId),
    ...(score.metricRefs ?? []).map((item) => item.metricId),
    ...(score.contextRefs ?? []).map((item) => item.contextId),
    ...(score.modifierRefs ?? []).map((item) => item.modifierId),
  ];
  return Object.fromEntries(ids.map((id) => [id, defaultValueForId(id)]));
}

function syncScenarioBase(score: ScoreDefinition): StudioScenario[] {
  const base = buildScenarioValues(score);
  const offset = (delta: number) =>
    Object.fromEntries(
      Object.entries(base).map(([id, value]) => [
        id,
        clampById(id, value + (id.startsWith("attribute.") ? delta / 2 : delta)),
      ]),
    );

  return [
    { id: "scenario.original", name: "Original", values: base },
    { id: "scenario.potential", name: "Potencial", values: offset(8) },
    { id: "scenario.injured", name: "Lesionado", values: offset(-12) },
    { id: "scenario.peak", name: "Pico de Carreira", values: offset(14) },
    { id: "scenario.great", name: "Epoca Excelente", values: offset(10) },
  ];
}

function buildEvaluateInput(
  score: ScoreDefinition,
  entityName: string,
  values: Record<string, number>,
  normalizationOverrides: Record<string, NormalizationRule>,
): EvaluateScoreInput {
  return {
    scoreId: score.id,
    entityKind: score.entityKind,
    entityId: entityName,
    attributes: (score.attributeRefs ?? []).map((item) => ({
      id: item.attributeId,
      value: values[item.attributeId],
      weight: item.weight,
      normalization: normalizationOverrides[item.attributeId],
      metadata: { source: "score-studio.playground", categoryId: score.categoryId },
    })),
    metrics: (score.metricRefs ?? []).map((item) => ({
      id: item.metricId,
      value: values[item.metricId],
      weight: item.weight,
      normalization: normalizationOverrides[item.metricId],
      metadata: { source: "score-studio.playground", categoryId: score.categoryId },
    })),
    contexts: (score.contextRefs ?? []).map((item) => ({
      id: item.contextId,
      value: values[item.contextId],
      weight: item.weight,
      normalization: normalizationOverrides[item.contextId],
      metadata: { source: "score-studio.playground", categoryId: score.categoryId },
    })),
    modifiers: (score.modifierRefs ?? []).map((item) => ({
      id: item.modifierId,
      value: values[item.modifierId],
      weight: item.weight,
      normalization: normalizationOverrides[item.modifierId],
      metadata: { source: "score-studio.playground", categoryId: score.categoryId },
    })),
  };
}

function evaluateBundle(
  score: ScoreDefinition,
  entityName: string,
  values: Record<string, number>,
  gradeScale: ScoreGradeScale,
  globalWeights: { attributes: number; metrics: number; contexts: number; modifiers: number },
  normalizationOverrides: Record<string, NormalizationRule>,
): StudioEvaluationBundle {
  const evaluateInput = buildEvaluateInput(score, entityName, values, normalizationOverrides);
  const result = evaluateScore(evaluateInput, {
    baseGroupWeights: {
      attributes: globalWeights.attributes,
      metrics: globalWeights.metrics,
      contexts: globalWeights.contexts,
    },
    modifierImpact: globalWeights.modifiers / 100,
    gradeScale,
  });
  const explain = explainScore(result);
  const validation = validateScore({ definition: score, evaluateInput, result });
  const debug = debugScore(result);
  return { result, explain, validation, debug };
}

function initialVersions(scores: ScoreDefinition[]): Record<string, ScoreVersionEntry[]> {
  const now = new Date().toISOString();
  const versions: Record<string, ScoreVersionEntry[]> = {};
  for (const score of scores) {
    versions[score.id] = [
      {
        id: makeId("version"),
        label: "v1",
        savedAt: now,
        score,
        note: "Initial snapshot",
        source: "defaults",
      },
    ];
  }
  return versions;
}

function normalizeScore(score: ScoreDefinition): ScoreDefinition {
  return {
    ...score,
    attributeRefs: score.attributeRefs ?? [],
    metricRefs: score.metricRefs ?? [],
    contextRefs: score.contextRefs ?? [],
    modifierRefs: score.modifierRefs ?? [],
    tags: score.tags ?? [],
    status: score.status ?? "draft",
    version: score.version ?? "1.0.0",
    metadata: {
      ...(score.metadata ?? {}),
    },
  };
}

function snapshotScore(score: ScoreDefinition, source: string): ScoreDefinition {
  const now = new Date().toISOString();
  return {
    ...normalizeScore(score),
    metadata: {
      ...(score.metadata ?? {}),
      source: (score.metadata?.source as string | undefined) ?? source,
      createdAt: (score.metadata?.createdAt as string | undefined) ?? now,
      updatedAt: now,
      studioSource: source,
    },
  };
}

function importableScores(json: string): ScoreDefinition[] {
  const parsed = JSON.parse(json) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.filter(Boolean) as ScoreDefinition[];
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as { score?: ScoreDefinition; scores?: ScoreDefinition[] };
    if (Array.isArray(record.scores)) return record.scores;
    if (record.score && typeof record.score === "object") return [record.score];
    if ("id" in record && "name" in record && "entityKind" in record)
      return [parsed as ScoreDefinition];
  }
  throw new Error("Invalid score JSON payload");
}

function buildEvaluationBaseline(score: ScoreDefinition): Record<string, number> {
  return buildScenarioValues(score);
}

function createEntityName(kind: ScoreEntityKind): string {
  return ENTITY_OPTIONS[kind][0] ?? titleCase(kind);
}

function createBlankScore(kind: ScoreEntityKind): ScoreDefinition {
  return snapshotScore(
    {
      id: `score.${kind}_${Math.random().toString(36).slice(2, 8)}` as ScoreId,
      name: `New ${titleCase(kind)} Score`,
      entityKind: kind,
      categoryId: `score_category.${kind}_custom` as ScoreDefinition["categoryId"],
      description: "Custom score created in Score Studio.",
      attributeRefs: [],
      metricRefs: [],
      contextRefs: [],
      modifierRefs: [],
      tags: ["custom"],
      status: "draft",
      version: "1.0.0",
      metadata: {
        position: kind === "player" ? "Any" : undefined,
        duty: kind === "player" ? "Balanced" : undefined,
      },
    },
    "create",
  );
}

function createPersistedState(
  scores: ScoreDefinition[],
  selectedScoreId: string,
  entityFilter: ScoreStudioState["entityFilter"],
  categoryFilter: string,
  tagFilter: string,
  searchTerm: string,
  favorites: Set<string>,
  versions: Record<string, ScoreVersionEntry[]>,
  gradeScale: ScoreGradeScale,
  globalWeights: ScoreStudioState["globalWeights"],
  normalizationOverrides: Record<string, NormalizationRule>,
  scenarios: StudioScenario[],
  activeScenarioId: string,
  selectedEntityKind: ScoreEntityKind,
  selectedEntityName: string,
  selectedVersionIdA: string | null,
  selectedVersionIdB: string | null,
): StudioPersistedState {
  return {
    version: 1,
    scores,
    selectedScoreId,
    entityFilter,
    categoryFilter,
    tagFilter,
    searchTerm,
    favorites: [...favorites],
    versions,
    gradeScale,
    globalWeights,
    normalizationOverrides,
    scenarios,
    activeScenarioId,
    selectedEntityKind,
    selectedEntityName,
    selectedVersionIdA,
    selectedVersionIdB,
  };
}

export function useScoreStudioState(): {
  state: ScoreStudioState;
  filteredScores: ScoreDefinition[];
  createScore: (kind: ScoreEntityKind) => void;
  duplicateScore: (scoreId: ScoreId) => void;
  removeScore: (scoreId: ScoreId) => void;
  updateScore: (updater: (score: ScoreDefinition) => ScoreDefinition) => void;
  updateScoreById: (scoreId: ScoreId, updater: (score: ScoreDefinition) => ScoreDefinition) => void;
  saveVersion: () => void;
  setEntityFilter: (value: ScoreEntityKind | "all") => void;
  setCategoryFilter: (value: string) => void;
  setTagFilter: (value: string) => void;
  setSearchTerm: (value: string) => void;
  setSelectedScoreId: (value: string) => void;
  toggleFavorite: (scoreId: string) => void;
  setGlobalWeight: (
    key: "attributes" | "metrics" | "contexts" | "modifiers",
    value: number,
  ) => void;
  setGradeThreshold: (index: number, key: "minScore" | "grade", value: string | number) => void;
  addGradeThreshold: () => void;
  removeGradeThreshold: (index: number) => void;
  setSelectedEntityKind: (kind: ScoreEntityKind) => void;
  setSelectedEntityName: (name: string) => void;
  setActiveScenario: (scenarioId: string) => void;
  saveScenario: (name: string) => void;
  updateSimulationValue: (componentId: string, value: number) => void;
  resetSimulationValues: () => void;
  randomizeScenario: () => void;
  exportScoreJson: (scoreId?: string) => string;
  exportScoresJson: () => string;
  importScoreJson: (json: string) => { ok: boolean; message: string };
  importScoresJson: (json: string) => { ok: boolean; message: string };
  resetToDefaults: () => void;
  setSelectedVersionA: (id: string | null) => void;
  setSelectedVersionB: (id: string | null) => void;
  setNormalizationOverride: (componentId: string, rule: NormalizationRule | null) => void;
} {
  const catalogs = useMemo(() => buildDictionaryCatalogs(), []);
  const persisted = useMemo(() => readPersistedState(), []);

  const initialScores = useMemo(() => {
    if (persisted?.scores?.length) return persisted.scores.map(normalizeScore);
    return BASE_SCORES.map(normalizeScore);
  }, [persisted]);

  const initialSelectedScoreId =
    persisted?.selectedScoreId &&
    initialScores.some((score) => score.id === persisted.selectedScoreId)
      ? persisted.selectedScoreId
      : (initialScores[0]?.id ?? "score.generic");

  const initialSelectedScore =
    initialScores.find((score) => score.id === initialSelectedScoreId) ??
    initialScores[0] ??
    createBlankScore("player");

  const [scores, setScores] = useState<ScoreDefinition[]>(initialScores);
  const [selectedScoreId, setSelectedScoreId] = useState<string>(initialSelectedScoreId);
  const [entityFilter, setEntityFilter] = useState<ScoreStudioState["entityFilter"]>(
    persisted?.entityFilter ?? "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(persisted?.categoryFilter ?? "all");
  const [tagFilter, setTagFilter] = useState<string>(persisted?.tagFilter ?? "all");
  const [searchTerm, setSearchTerm] = useState<string>(persisted?.searchTerm ?? "");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(persisted?.favorites ?? []));
  const [globalWeights, setGlobalWeightsState] = useState(
    persisted?.globalWeights ?? {
      attributes: 1,
      metrics: 1,
      contexts: 1,
      modifiers: 20,
    },
  );
  const [gradeScale, setGradeScale] = useState<ScoreGradeScale>(
    persisted?.gradeScale ?? DEFAULT_GRADE_SCALE,
  );
  const [normalizationOverrides, setNormalizationOverrides] = useState<
    Record<string, NormalizationRule>
  >(persisted?.normalizationOverrides ?? {});
  const [versions, setVersions] = useState<Record<string, ScoreVersionEntry[]>>(
    persisted?.versions ?? initialVersions(initialScores),
  );
  const [selectedEntityKind, setSelectedEntityKindState] = useState<ScoreEntityKind>(
    persisted?.selectedEntityKind ?? initialSelectedScore.entityKind,
  );
  const [selectedEntityName, setSelectedEntityNameState] = useState<string>(
    persisted?.selectedEntityName ?? createEntityName(initialSelectedScore.entityKind),
  );
  const [selectedVersionIdA, setSelectedVersionA] = useState<string | null>(
    persisted?.selectedVersionIdA ?? null,
  );
  const [selectedVersionIdB, setSelectedVersionB] = useState<string | null>(
    persisted?.selectedVersionIdB ?? null,
  );
  const [scenarios, setScenarios] = useState<StudioScenario[]>(
    persisted?.scenarios?.length ? persisted.scenarios : syncScenarioBase(initialSelectedScore),
  );
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    persisted?.activeScenarioId ?? "scenario.original",
  );

  useEffect(() => {
    if (scores.length === 0) return;
    if (scores.some((score) => score.id === selectedScoreId)) return;
    setSelectedScoreId(scores[0].id);
  }, [scores, selectedScoreId]);

  const selectedScore = useMemo(
    () => scores.find((item) => item.id === selectedScoreId) ?? scores[0],
    [scores, selectedScoreId],
  );

  useEffect(() => {
    if (!selectedScore) return;
    setSelectedEntityKindState(selectedScore.entityKind);
    setSelectedEntityNameState(createEntityName(selectedScore.entityKind));
    setScenarios(syncScenarioBase(selectedScore));
    setActiveScenarioId("scenario.original");
    setSelectedVersionA(null);
    setSelectedVersionB(null);
  }, [selectedScoreId]);

  const baselineValues = useMemo(() => buildEvaluationBaseline(selectedScore), [selectedScore]);

  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0],
    [scenarios, activeScenarioId],
  );

  const simulationValues = activeScenario?.values ?? baselineValues;

  const originalEvaluation = useMemo(() => {
    return evaluateBundle(
      selectedScore,
      selectedEntityName,
      baselineValues,
      gradeScale,
      globalWeights,
      normalizationOverrides,
    );
  }, [
    selectedScore,
    selectedEntityName,
    baselineValues,
    gradeScale,
    globalWeights,
    normalizationOverrides,
  ]);

  const simulationEvaluation = useMemo(
    () =>
      evaluateBundle(
        selectedScore,
        selectedEntityName,
        simulationValues,
        gradeScale,
        globalWeights,
        normalizationOverrides,
      ),
    [
      selectedScore,
      selectedEntityName,
      simulationValues,
      gradeScale,
      globalWeights,
      normalizationOverrides,
    ],
  );

  const filteredScores = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scores.filter((score) => {
      if (entityFilter !== "all" && score.entityKind !== entityFilter) return false;
      if (categoryFilter !== "all" && score.categoryId !== categoryFilter) return false;
      if (tagFilter !== "all" && !scoreTagList(score).includes(tagFilter.toLowerCase()))
        return false;
      if (!q) return true;
      return (
        score.id.toLowerCase().includes(q) ||
        score.name.toLowerCase().includes(q) ||
        (score.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [scores, entityFilter, categoryFilter, tagFilter, searchTerm]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = createPersistedState(
      scores,
      selectedScoreId,
      entityFilter,
      categoryFilter,
      tagFilter,
      searchTerm,
      favorites,
      versions,
      gradeScale,
      globalWeights,
      normalizationOverrides,
      scenarios,
      activeScenarioId,
      selectedEntityKind,
      selectedEntityName,
      selectedVersionIdA,
      selectedVersionIdB,
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    scores,
    selectedScoreId,
    entityFilter,
    categoryFilter,
    tagFilter,
    searchTerm,
    favorites,
    versions,
    gradeScale,
    globalWeights,
    normalizationOverrides,
    scenarios,
    activeScenarioId,
    selectedEntityKind,
    selectedEntityName,
    selectedVersionIdA,
    selectedVersionIdB,
  ]);

  const createScore = (kind: ScoreEntityKind): void => {
    const newScore = createBlankScore(kind);
    setScores((prev) => [newScore, ...prev]);
    setSelectedScoreId(newScore.id);
    setSelectedEntityKindState(kind);
    setSelectedEntityNameState(createEntityName(kind));
    setScenarios(syncScenarioBase(newScore));
    setActiveScenarioId("scenario.original");
    setVersions((prev) => ({
      ...prev,
      [newScore.id]: [
        {
          id: makeId("version"),
          label: "v1",
          savedAt: new Date().toISOString(),
          score: newScore,
          note: "Initial snapshot",
          source: "create",
        },
      ],
    }));
  };

  const duplicateScore = (scoreId: ScoreId): void => {
    const source = scores.find((score) => score.id === scoreId);
    if (!source) return;
    const copyId = `${source.id}_copy_${Math.random().toString(36).slice(2, 6)}` as ScoreId;
    const copy = snapshotScore(
      {
        ...source,
        id: copyId,
        name: `${source.name} (Copy)`,
        status: "draft",
        version: "1.0.0",
      },
      "duplicate",
    );
    setScores((prev) => [copy, ...prev]);
    setSelectedScoreId(copyId);
    setSelectedEntityKindState(copy.entityKind);
    setSelectedEntityNameState(createEntityName(copy.entityKind));
    setScenarios(syncScenarioBase(copy));
    setActiveScenarioId("scenario.original");
    setVersions((prev) => ({
      ...prev,
      [copyId]: [
        {
          id: makeId("version"),
          label: "v1",
          savedAt: new Date().toISOString(),
          score: copy,
          note: "Copied from source score",
          source: source.id,
        },
      ],
    }));
  };

  const removeScore = (scoreId: ScoreId): void => {
    setScores((prev) => prev.filter((score) => score.id !== scoreId));
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(scoreId);
      return next;
    });
    setVersions((prev) => {
      const next = { ...prev };
      delete next[scoreId];
      return next;
    });
  };

  const updateScore = (updater: (score: ScoreDefinition) => ScoreDefinition): void => {
    setScores((prev) =>
      prev.map((score) => {
        if (score.id !== selectedScoreId) return score;
        const updated = snapshotScore(updater(score), "edit");
        return updated;
      }),
    );
  };

  const updateScoreById = (
    scoreId: ScoreId,
    updater: (score: ScoreDefinition) => ScoreDefinition,
  ): void => {
    setScores((prev) =>
      prev.map((score) => {
        if (score.id !== scoreId) return score;
        return snapshotScore(updater(score), "edit");
      }),
    );
  };

  const saveVersion = (): void => {
    const current = scores.find((score) => score.id === selectedScoreId);
    if (!current) return;
    setVersions((prev) => {
      const existing = prev[current.id] ?? [];
      const label = `v${existing.length + 1}`;
      return {
        ...prev,
        [current.id]: [
          ...existing,
          {
            id: makeId("version"),
            label,
            savedAt: new Date().toISOString(),
            score: current,
            note: "Studio snapshot",
            source: "manual",
          },
        ],
      };
    });
  };

  const setGlobalWeight = (
    key: "attributes" | "metrics" | "contexts" | "modifiers",
    value: number,
  ): void => {
    setGlobalWeightsState((prev) => ({ ...prev, [key]: value }));
  };

  const setGradeThreshold = (
    index: number,
    key: "minScore" | "grade",
    value: string | number,
  ): void => {
    setGradeScale((prev) => {
      const thresholds = [...prev.thresholds];
      thresholds[index] = { ...thresholds[index], [key]: value as never };
      return { ...prev, thresholds };
    });
  };

  const addGradeThreshold = (): void => {
    setGradeScale((prev) => ({
      ...prev,
      thresholds: [...prev.thresholds, { minScore: 50, grade: "E" }],
    }));
  };

  const removeGradeThreshold = (index: number): void => {
    setGradeScale((prev) => ({
      ...prev,
      thresholds: prev.thresholds.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const setSelectedEntityKind = (kind: ScoreEntityKind): void => {
    setSelectedEntityKindState(kind);
  };

  const setSelectedEntityName = (name: string): void => {
    setSelectedEntityNameState(name);
  };

  const setActiveScenario = (scenarioId: string): void => {
    setActiveScenarioId(scenarioId);
  };

  const saveScenario = (name: string): void => {
    setScenarios((prev) => {
      const current = prev.find((scenario) => scenario.id === activeScenarioId) ??
        prev[0] ?? { id: "scenario.original", name: "Original", values: baselineValues };
      const next = {
        ...current,
        id: makeId("scenario"),
        name: name.trim() || current.name,
      };
      return [...prev, next];
    });
  };

  const updateSimulationValue = (componentId: string, value: number): void => {
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === activeScenarioId
          ? {
              ...scenario,
              values: {
                ...scenario.values,
                [componentId]: value,
              },
            }
          : scenario,
      ),
    );
  };

  const resetSimulationValues = (): void => {
    setScenarios(syncScenarioBase(selectedScore));
    setActiveScenarioId("scenario.original");
  };

  const randomizeScenario = (): void => {
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === activeScenarioId
          ? {
              ...scenario,
              values: Object.fromEntries(
                Object.entries(scenario.values).map(([id]) => [
                  id,
                  Math.round(Math.random() * (id.startsWith("attribute.") ? 20 : 100)),
                ]),
              ),
            }
          : scenario,
      ),
    );
  };

  const exportScoreJson = (scoreId = selectedScoreId): string => {
    const score = scores.find((item) => item.id === scoreId);
    if (!score) return "";
    return JSON.stringify(score, null, 2);
  };

  const exportScoresJson = (): string => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        scores,
      },
      null,
      2,
    );
  };

  const importScoresJson = (json: string): { ok: boolean; message: string } => {
    try {
      const imported = importableScores(json).map((score) => snapshotScore(score, "import"));
      if (imported.length === 0) return { ok: false, message: "Nenhum score encontrado no JSON." };

      setScores((prev) => {
        const next = [...prev];
        for (const score of imported) {
          const index = next.findIndex((item) => item.id === score.id);
          if (index >= 0) next[index] = score;
          else next.unshift(score);
        }
        return next;
      });

      setVersions((prev) => {
        const next = { ...prev };
        for (const score of imported) {
          next[score.id] = [
            {
              id: makeId("version"),
              label: "v1",
              savedAt: new Date().toISOString(),
              score,
              note: "Imported into studio",
              source: "import",
            },
          ];
        }
        return next;
      });

      setSelectedScoreId(imported[0].id);
      setSelectedEntityKindState(imported[0].entityKind);
      setSelectedEntityNameState(createEntityName(imported[0].entityKind));
      setScenarios(syncScenarioBase(imported[0]));
      setActiveScenarioId("scenario.original");
      return { ok: true, message: `${imported.length} score(s) importado(s) com sucesso.` };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Falha ao importar scores.",
      };
    }
  };

  const importScoreJson = (json: string): { ok: boolean; message: string } =>
    importScoresJson(json);

  const resetToDefaults = (): void => {
    const fallbackScores = BASE_SCORES.map(normalizeScore);
    setScores(fallbackScores);
    setSelectedScoreId(fallbackScores[0]?.id ?? "score.generic");
    setEntityFilter("all");
    setCategoryFilter("all");
    setTagFilter("all");
    setSearchTerm("");
    setFavorites(new Set());
    setVersions(initialVersions(fallbackScores));
    setGradeScale(DEFAULT_GRADE_SCALE);
    setGlobalWeightsState({ attributes: 1, metrics: 1, contexts: 1, modifiers: 20 });
    setNormalizationOverrides({});
    setScenarios(syncScenarioBase(fallbackScores[0] ?? createBlankScore("player")));
    setActiveScenarioId("scenario.original");
    setSelectedEntityKindState(fallbackScores[0]?.entityKind ?? "player");
    setSelectedEntityNameState(createEntityName(fallbackScores[0]?.entityKind ?? "player"));
    setSelectedVersionA(null);
    setSelectedVersionB(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const setNormalizationOverride = (componentId: string, rule: NormalizationRule | null): void => {
    setNormalizationOverrides((prev) => {
      const next = { ...prev };
      if (rule) next[componentId] = rule;
      else delete next[componentId];
      return next;
    });
  };

  const toggleFavorite = (scoreId: string): void => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(scoreId)) next.delete(scoreId);
      else next.add(scoreId);
      return next;
    });
  };

  const state: ScoreStudioState = {
    catalogs,
    scores,
    selectedScoreId,
    selectedScore,
    entityFilter,
    categoryFilter,
    tagFilter,
    searchTerm,
    favorites,
    versions,
    gradeScale,
    globalWeights,
    normalizationOverrides,
    selectedEntityName,
    selectedEntityKind,
    scenarios,
    activeScenarioId,
    originalScenarioId: "scenario.original",
    baselineValues,
    simulationValues,
    originalEvaluation,
    simulationEvaluation,
    selectedVersionIdA,
    selectedVersionIdB,
  };

  return {
    state,
    filteredScores,
    createScore,
    duplicateScore,
    removeScore,
    updateScore,
    updateScoreById,
    saveVersion,
    setEntityFilter,
    setCategoryFilter,
    setTagFilter,
    setSearchTerm,
    setSelectedScoreId,
    toggleFavorite,
    setGlobalWeight,
    setGradeThreshold,
    addGradeThreshold,
    removeGradeThreshold,
    setSelectedEntityKind,
    setSelectedEntityName,
    setActiveScenario,
    saveScenario,
    updateSimulationValue,
    resetSimulationValues,
    randomizeScenario,
    exportScoreJson,
    exportScoresJson,
    importScoreJson,
    importScoresJson,
    resetToDefaults,
    setSelectedVersionA,
    setSelectedVersionB,
    setNormalizationOverride,
  };
}
