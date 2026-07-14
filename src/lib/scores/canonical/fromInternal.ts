/**
 * Internal ScoreDefinition -> Canonical (Human / AI Friendly) conversion.
 */
import type { ScoreDefinition } from "../types";
import { labelForInternalId } from "./resolver";
import type { CanonicalRefKind, CanonicalScore, CanonicalScoreDocument, CanonicalWeightedRef } from "./types";

function labelFor(kind: CanonicalRefKind, id: string): string {
  return labelForInternalId(kind, id);
}

function pickCategory(score: ScoreDefinition): string | undefined {
  const raw = score.categoryId;
  if (!raw) return undefined;
  const short = String(raw).split(".").slice(1).join(".") || String(raw);
  return short.replace(/_/g, " ");
}

export function convertInternalToCanonical(score: ScoreDefinition): CanonicalScore {
  const attributes: CanonicalWeightedRef[] =
    score.attributeRefs?.map((r) => ({
      name: labelFor("attribute", r.attributeId),
      weight: r.weight ?? 0,
    })) ?? [];
  const metrics: CanonicalWeightedRef[] =
    score.metricRefs?.map((r) => ({
      name: labelFor("metric", r.metricId),
      weight: r.weight ?? 0,
    })) ?? [];
  const contexts: CanonicalWeightedRef[] =
    score.contextRefs?.map((r) => ({
      name: labelFor("context", r.contextId),
      weight: r.weight ?? 0,
    })) ?? [];
  const modifiers: CanonicalWeightedRef[] =
    score.modifierRefs?.map((r) => ({
      name: labelFor("modifier", r.modifierId),
      weight: r.weight ?? 0,
    })) ?? [];

  const canonical: CanonicalScore = {
    name: score.name,
    entity: score.entityKind,
    category: pickCategory(score),
    description: score.description,
    tags: score.tags,
  };
  if (attributes.length) canonical.attributes = attributes;
  if (metrics.length) canonical.metrics = metrics;
  if (contexts.length) canonical.contexts = contexts;
  if (modifiers.length) canonical.modifiers = modifiers;
  return canonical;
}

export function buildCanonicalDocument(scores: ScoreDefinition[]): CanonicalScoreDocument {
  return {
    format: "canonical-score",
    version: 1,
    scores: scores.map(convertInternalToCanonical),
  };
}
