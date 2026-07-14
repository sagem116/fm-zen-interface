import type {
  CanonicalId,
  ExplainResult,
  ExplainTraceStep,
  ScoreBreakdownItem,
  ScoreDefinition,
  ScoreEvidence,
  ScoreResult,
  ScoreResultComponents,
  ScoreResultMeta,
} from "./types";

const SCORE_SCHEMA_VERSION = "1.0" as const;

interface ExplainCatalogs {
  scores: ScoreDefinition[];
}

function resolveTraceGroup(id: CanonicalId): ExplainTraceStep["group"] {
  if (id.startsWith("attribute.")) return "attributes";
  if (id.startsWith("metric.")) return "metrics";
  if (id.startsWith("context.")) return "contexts";
  return "modifiers";
}

function buildFallbackMeta(result: ScoreResult): ScoreResultMeta {
  return {
    schemaVersion: SCORE_SCHEMA_VERSION,
    engineVersion: "1.0",
    generatedAt: result.computedAt ?? new Date().toISOString(),
    scoreId: result.scoreId,
    entityKind: "unknown",
    entityId: result.entityId,
  };
}

function toEvidenceFromBreakdown(item: ScoreBreakdownItem, score?: ScoreDefinition): ScoreEvidence {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  return {
    id: item.id,
    label: String(metadata.name ?? item.id),
    rawValue: item.value ?? null,
    normalizedValue: item.normalizedValue ?? 0,
    weight: item.normalizedWeight ?? item.weight ?? 0,
    contribution: item.contribution ?? 0,
    source: String(metadata.source ?? score?.metadata?.source ?? "score-engine"),
    unit: metadata.unit ? String(metadata.unit) : undefined,
    category: metadata.categoryId ? String(metadata.categoryId) : undefined,
    status: "used",
  };
}

function toIgnoredEvidence(
  group: "attributes" | "metrics" | "contexts" | "modifiers",
  components: ScoreResultComponents,
): ScoreEvidence[] {
  const sourceGroup =
    group === "attributes"
      ? components.attributes
      : group === "metrics"
        ? components.metrics
        : group === "contexts"
          ? components.contexts
          : components.modifiers;

  return (sourceGroup.ignoredComponents ?? []).map((item) => {
    const metadata = (item.metadata ?? {}) as Record<string, unknown>;
    return {
      id: item.id,
      label: String(metadata.name ?? item.id),
      rawValue: item.value ?? null,
      normalizedValue: 0,
      weight: 0,
      contribution: 0,
      source: String(metadata.source ?? "score-engine"),
      unit: metadata.unit ? String(metadata.unit) : undefined,
      category: metadata.categoryId ? String(metadata.categoryId) : undefined,
      status: "ignored",
    };
  });
}

function buildTrace(used: ScoreEvidence[], ignored: ScoreEvidence[]): ExplainTraceStep[] {
  const usedTrace = used.map((item) => ({
    group: resolveTraceGroup(item.id),
    id: item.id,
    rawValue: item.rawValue,
    normalizedValue: item.normalizedValue,
    weight: item.weight,
    contribution: item.contribution,
    status: "used" as const,
  }));

  const ignoredTrace = ignored.map((item) => ({
    group: resolveTraceGroup(item.id),
    id: item.id,
    rawValue: item.rawValue,
    normalizedValue: 0,
    weight: 0,
    contribution: 0,
    status: "ignored" as const,
  }));

  return [...usedTrace, ...ignoredTrace];
}

export function explainScore(
  result: ScoreResult,
  catalogs: ExplainCatalogs = { scores: [] },
): ExplainResult {
  const groups = result.components ?? {
    attributes: {
      subtotal: 0,
      totalWeight: 0,
      totalComponents: 0,
      availableComponents: 0,
      coverage: 0,
      components: [],
      ignoredComponents: [],
    },
    metrics: {
      subtotal: 0,
      totalWeight: 0,
      totalComponents: 0,
      availableComponents: 0,
      coverage: 0,
      components: [],
      ignoredComponents: [],
    },
    contexts: {
      subtotal: 0,
      totalWeight: 0,
      totalComponents: 0,
      availableComponents: 0,
      coverage: 0,
      components: [],
      ignoredComponents: [],
    },
    modifiers: {
      subtotal: 0,
      totalWeight: 0,
      totalComponents: 0,
      availableComponents: 0,
      coverage: 0,
      components: [],
      ignoredComponents: [],
    },
    baseScore: 0,
    modifierAdjustment: 0,
  };

  const scoreDef = catalogs.scores.find((score) => score.id === result.scoreId);
  const usedComponents = (result.breakdown?.sections ?? [])
    .flatMap((section) => section.items)
    .map((item) => toEvidenceFromBreakdown(item, scoreDef));

  const ignoredComponents = [
    ...toIgnoredEvidence("attributes", groups),
    ...toIgnoredEvidence("metrics", groups),
    ...toIgnoredEvidence("contexts", groups),
    ...toIgnoredEvidence("modifiers", groups),
  ];

  const contributions = [...usedComponents].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );

  const meta = result.meta ?? buildFallbackMeta(result);

  return {
    schemaVersion: SCORE_SCHEMA_VERSION,
    score: result.score ?? result.value ?? null,
    grade: result.grade,
    confidence: result.confidence,
    groups,
    breakdown: result.breakdown,
    contributions,
    usedComponents,
    ignoredComponents,
    trace: buildTrace(usedComponents, ignoredComponents),
    meta,
  };
}

export function componentContribution(explain: ExplainResult): Record<CanonicalId, number> {
  const entries = explain.contributions.map((item) => [item.id, item.contribution] as const);
  return Object.fromEntries(entries) as Record<CanonicalId, number>;
}

export function largestPositiveContribution(explain: ExplainResult): ScoreEvidence | undefined {
  return explain.contributions
    .filter((item) => item.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)[0];
}

export function largestNegativeContribution(explain: ExplainResult): ScoreEvidence | undefined {
  return explain.contributions
    .filter((item) => item.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)[0];
}

export function confidenceBreakdown(result: ScoreResult): ScoreResult["confidence"] {
  return result.confidence;
}
