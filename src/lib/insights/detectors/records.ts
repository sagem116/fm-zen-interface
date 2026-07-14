// Detector: recordes (maior pontuação, mais títulos, séries, absolutos).
import { narrate } from "../narrative";
import type { Detector, Insight, InsightContext, RecordRow } from "../types";

function entityRef(ctx: InsightContext, row: RecordRow): Insight["entity"] {
  const pool =
    row.entityKind === "club"
      ? ctx.entities.clubs
      : row.entityKind === "player"
        ? ctx.entities.players
        : row.entityKind === "coach"
          ? ctx.entities.coaches
          : row.entityKind === "competition"
            ? ctx.entities.competitions
            : row.entityKind === "country"
              ? ctx.entities.countries
              : [];
  const found = pool.find((e) => e.id === row.entityId);
  return { kind: row.entityKind, id: row.entityId, name: found?.name ?? row.entityId };
}

const METRIC_TO_TEMPLATE: Record<string, Parameters<typeof narrate>[0]> = {
  highest_score: "records.highest_score",
  most_titles: "records.most_titles",
  consecutive_seasons: "records.consecutive_seasons",
  best_streak: "records.best_streak",
};

export const recordsDetector: Detector = {
  id: "records",
  category: "records",
  run(ctx) {
    const out: Insight[] = [];
    // Para cada métrica, encontrar o líder (valor máximo).
    const byMetric = new Map<string, RecordRow[]>();
    for (const r of ctx.records) {
      const arr = byMetric.get(r.metric) ?? [];
      arr.push(r);
      byMetric.set(r.metric, arr);
    }
    for (const [metric, rows] of byMetric) {
      const top = rows.reduce((a, b) => (b.value > a.value ? b : a));
      const entity = entityRef(ctx, top);
      const templateKey = METRIC_TO_TEMPLATE[metric] ?? "records.absolute_record";
      const n = narrate(templateKey, { entity: entity.name, value: top.value, metric });
      out.push({
        id: `records:${metric}:${entity.id}`,
        detector: "records",
        category: "records",
        type: metric,
        entity,
        season: top.season ?? null,
        importance: 75,
        confidence: 1,
        generatedAt: new Date().toISOString(),
        ...n,
        evidence: [{ metric, current: top.value, ref: top.ref ?? undefined }],
        data: { metric, value: top.value },
      });
    }
    return out;
  },
};
