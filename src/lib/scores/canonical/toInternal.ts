/**
 * Canonical -> Internal ScoreDefinition conversion.
 *
 * All resolution is isolated here. Never mutates the Score Engine.
 */
import type {
  AttributeReference,
  ContextReference,
  MetricReference,
  ModifierReference,
  ScoreCategoryId,
  ScoreDefinition,
  ScoreId,
} from "../types";
import { resolveCanonicalName } from "./resolver";
import type {
  CanonicalRefKind,
  CanonicalScore,
  CanonicalWeightedRef,
  ResolutionReport,
  ResolvedRef,
} from "./types";

function slug(input: string): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim() || "score";
}

function toScoreCategoryId(category: string | undefined): ScoreCategoryId {
  const s = slug(category ?? "general");
  return `score_category.${s}` as ScoreCategoryId;
}

function resolveGroup(
  kind: CanonicalRefKind,
  refs: CanonicalWeightedRef[] | undefined,
): ResolvedRef[] {
  if (!refs) return [];
  return refs.map((ref) => {
    const outcome = resolveCanonicalName(kind, ref.name);
    return {
      kind,
      input: ref.name,
      weight: Number.isFinite(ref.weight) ? ref.weight : 0,
      status: outcome.status,
      matchedId: outcome.matchedId,
      matchedLabel: outcome.matchedLabel,
      candidates: outcome.candidates,
    };
  });
}

export function buildResolutionReport(canonical: CanonicalScore): ResolutionReport {
  const refs: ResolvedRef[] = [
    ...resolveGroup("attribute", canonical.attributes),
    ...resolveGroup("metric", canonical.metrics),
    ...resolveGroup("context", canonical.contexts),
    ...resolveGroup("modifier", canonical.modifiers),
  ];
  let resolved = 0, ambiguous = 0, unknown = 0;
  for (const r of refs) {
    if (r.status === "resolved") resolved += 1;
    else if (r.status === "ambiguous") ambiguous += 1;
    else unknown += 1;
  }
  return {
    scoreName: canonical.name,
    entity: canonical.entity,
    refs,
    resolvedCount: resolved,
    ambiguousCount: ambiguous,
    unknownCount: unknown,
  };
}

export interface ConversionOptions {
  /** Manual overrides keyed by "kind:input" -> internalId */
  overrides?: Record<string, string>;
  /** Existing score id to reuse (e.g. edit mode). */
  scoreId?: ScoreId;
}

export interface ConversionResult {
  score: ScoreDefinition;
  report: ResolutionReport;
  usedOverrides: string[];
}

function overrideKey(kind: CanonicalRefKind, input: string): string {
  return `${kind}:${input}`;
}

function applyOverride(ref: ResolvedRef, overrides?: Record<string, string>): ResolvedRef {
  if (!overrides) return ref;
  const key = overrideKey(ref.kind, ref.input);
  const forced = overrides[key];
  if (!forced) return ref;
  return { ...ref, status: "resolved", matchedId: forced };
}

export function convertCanonicalToInternal(
  canonical: CanonicalScore,
  options: ConversionOptions = {},
): ConversionResult {
  const rawReport = buildResolutionReport(canonical);
  const usedOverrides: string[] = [];
  const refs = rawReport.refs.map((ref) => {
    const applied = applyOverride(ref, options.overrides);
    if (applied.matchedId && applied !== ref) {
      usedOverrides.push(overrideKey(ref.kind, ref.input));
    }
    return applied;
  });

  const attributeRefs: AttributeReference[] = [];
  const metricRefs: MetricReference[] = [];
  const contextRefs: ContextReference[] = [];
  const modifierRefs: ModifierReference[] = [];

  for (const ref of refs) {
    if (ref.status !== "resolved" || !ref.matchedId) continue;
    switch (ref.kind) {
      case "attribute":
        attributeRefs.push({ attributeId: ref.matchedId as AttributeReference["attributeId"], weight: ref.weight });
        break;
      case "metric":
        metricRefs.push({ metricId: ref.matchedId as MetricReference["metricId"], weight: ref.weight });
        break;
      case "context":
        contextRefs.push({ contextId: ref.matchedId as ContextReference["contextId"], weight: ref.weight });
        break;
      case "modifier":
        modifierRefs.push({ modifierId: ref.matchedId as ModifierReference["modifierId"], weight: ref.weight });
        break;
    }
  }

  const scoreId = options.scoreId ?? (`score.${slug(canonical.name)}_${Date.now().toString(36)}` as ScoreId);

  const score: ScoreDefinition = {
    id: scoreId,
    name: canonical.name.trim() || "Untitled Score",
    entityKind: canonical.entity,
    categoryId: toScoreCategoryId(canonical.category),
    description: canonical.description,
    tags: canonical.tags,
    attributeRefs,
    metricRefs,
    contextRefs,
    modifierRefs,
    status: "draft",
    metadata: {
      source: "canonical-import",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const finalReport: ResolutionReport = {
    ...rawReport,
    refs,
    resolvedCount: refs.filter((r) => r.status === "resolved").length,
    ambiguousCount: refs.filter((r) => r.status === "ambiguous").length,
    unknownCount: refs.filter((r) => r.status === "unknown").length,
  };

  return { score, report: finalReport, usedOverrides };
}
