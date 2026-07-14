import type { CohortStats, DomainEntity, EngineContext, EntityKind, MetricDef } from "../types";
import type { MetricRegistry } from "../registry";

function computeStats(values: number[]): CohortStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) {
    return {
      count: 0,
      values: sorted,
      min: 0,
      max: 0,
      mean: 0,
      stddev: 0,
      percentile: () => 0.5,
    };
  }
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
  const stddev = Math.sqrt(variance);
  return {
    count: n,
    values: sorted,
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    stddev,
    percentile: (v: number) => {
      if (n === 0) return 0.5;
      // fraction of values strictly less than v + 0.5 * equal count
      let lt = 0;
      let eq = 0;
      for (const x of sorted) {
        if (x < v) lt++;
        else if (x === v) eq++;
        else break;
      }
      return (lt + 0.5 * eq) / n;
    },
  };
}

export interface BuildContextOpts {
  kind: EntityKind;
  cohort: readonly DomainEntity[];
  metrics: MetricRegistry;
  now?: Date;
}

export function buildContext(opts: BuildContextOpts): EngineContext {
  const now = opts.now ?? new Date();
  const metricCache = new Map<string, Map<string, number | null>>(); // metricId -> entityId -> value
  const statsCache = new Map<string, CohortStats>();

  const ctx: EngineContext = {
    kind: opts.kind,
    now,
    cohort: opts.cohort,
    metricValue(metricId, entity) {
      let inner = metricCache.get(metricId);
      if (!inner) {
        inner = new Map();
        metricCache.set(metricId, inner);
      }
      if (inner.has(entity.id)) return inner.get(entity.id) ?? null;
      const def = opts.metrics.get(metricId) as MetricDef | undefined;
      if (!def) {
        inner.set(entity.id, null);
        return null;
      }
      let value: number | null = null;
      try {
        const v = def.compute(entity, ctx);
        value = typeof v === "number" && Number.isFinite(v) ? v : null;
      } catch {
        value = null;
      }
      inner.set(entity.id, value);
      return value;
    },
    statsFor(metricId) {
      const cached = statsCache.get(metricId);
      if (cached) return cached;
      const vals: number[] = [];
      for (const e of opts.cohort) {
        const v = ctx.metricValue(metricId, e);
        if (v != null) vals.push(v);
      }
      const stats = computeStats(vals);
      statsCache.set(metricId, stats);
      return stats;
    },
  };

  return ctx;
}
