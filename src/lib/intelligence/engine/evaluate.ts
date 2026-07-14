import type {
  DomainEntity,
  EngineContext,
  Evidence,
  Normalizer,
  RuleDef,
  TraitDef,
  TraitResult,
} from "../types";
import type { Registries } from "../registry";

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function normalizeValue(
  raw: number,
  normalizer: Normalizer,
  metricId: string,
  ctx: EngineContext,
): number {
  switch (normalizer.kind) {
    case "identity":
      return clamp01(raw);
    case "linear": {
      const { min, max } = normalizer;
      if (max === min) return 0.5;
      return clamp01((raw - min) / (max - min));
    }
    case "percentile": {
      const stats = ctx.statsFor(metricId);
      return clamp01(stats.percentile(raw));
    }
    case "threshold": {
      const band = normalizer.band ?? 1;
      if (band <= 0) return raw >= normalizer.at ? 1 : 0;
      return clamp01((raw - (normalizer.at - band)) / (2 * band));
    }
  }
}

export interface RuleEvaluation {
  score: number; // 0..1
  confidence: number; // 0..1
  evidence: Evidence[];
}

export function evaluateRule(
  rule: RuleDef,
  entity: DomainEntity,
  ctx: EngineContext,
  registries: Registries,
): RuleEvaluation {
  const totalWeight = rule.inputs.reduce((s, i) => s + Math.max(0, i.weight), 0);
  const evidence: Evidence[] = [];

  let nonNull = 0;
  const subs: number[] = [];

  for (const input of rule.inputs) {
    const metric = registries.metrics.get(input.metricId);
    const raw = ctx.metricValue(input.metricId, entity);
    const w = totalWeight > 0 ? Math.max(0, input.weight) / totalWeight : 0;

    let normalized = 0;
    if (raw != null && metric) {
      const base = normalizeValue(raw, input.normalize, input.metricId, ctx);
      normalized = input.direction === "higher" ? base : 1 - base;
      nonNull++;
    }

    const contribution = normalized * w;
    evidence.push({
      metricId: input.metricId,
      metricLabel: metric?.label ?? input.metricId,
      unit: metric?.unit,
      rawValue: raw,
      normalizedValue: normalized,
      weight: w,
      contribution,
      normalizer: input.normalize,
    });

    if (raw != null) subs.push(normalized);
  }

  let score = 0;
  if (rule.aggregate === "weightedMean") {
    score = evidence.reduce((s, ev) => s + ev.contribution, 0);
  } else if (rule.aggregate === "min") {
    score = subs.length ? Math.min(...subs) : 0;
  } else if (rule.aggregate === "max") {
    score = subs.length ? Math.max(...subs) : 0;
  }

  return {
    score: clamp01(score),
    confidence: rule.inputs.length ? nonNull / rule.inputs.length : 0,
    evidence,
  };
}

export function evaluateTrait(
  trait: TraitDef,
  entity: DomainEntity,
  ctx: EngineContext,
  registries: Registries,
): TraitResult {
  const rule = registries.rules.requireGet(trait.ruleId);
  const evalResult = evaluateRule(rule, entity, ctx, registries);
  const level = resolveLevel(evalResult.score, trait);
  return {
    id: trait.id,
    label: trait.label,
    group: trait.group,
    polarity: trait.polarity,
    score: Math.round(evalResult.score * 1000) / 10, // 0..100 with 1 decimal
    confidence: Math.round(evalResult.confidence * 1000) / 1000,
    level,
    ruleId: trait.ruleId,
    evidence: evalResult.evidence,
  };
}

function resolveLevel(score: number, trait: TraitDef): string | undefined {
  if (!trait.levels || trait.levels.length === 0) return undefined;
  const sorted = [...trait.levels].sort((a, b) => b.min - a.min);
  for (const lvl of sorted) {
    if (score >= lvl.min) return lvl.label;
  }
  return undefined;
}
