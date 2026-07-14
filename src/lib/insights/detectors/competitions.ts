// Detector: domínio em competições (nacional, continental, mundial).
import { narrate } from "../narrative";
import type { Detector, Insight, InsightContext, RankingSnapshot } from "../types";

function entityRef(ctx: InsightContext, snap: RankingSnapshot): Insight["entity"] {
  const found =
    ctx.entities.clubs.find((e) => e.id === snap.entityId) ??
    ctx.entities.competitions.find((e) => e.id === snap.entityId) ??
    ctx.entities.countries.find((e) => e.id === snap.entityId);
  return { kind: snap.entityKind, id: snap.entityId, name: found?.name ?? snap.entityId };
}

function leadersFor(
  ctx: InsightContext,
  scope: RankingSnapshot["scope"],
  season: string,
): RankingSnapshot[] {
  return ctx.rankings.filter((r) => r.scope === scope && r.season === season && r.position === 1);
}

export const competitionsDetector: Detector = {
  id: "competitions",
  category: "competitions",
  run(ctx) {
    const out: Insight[] = [];
    const season = ctx.season;
    if (!season) return out;

    for (const snap of leadersFor(ctx, "national", season)) {
      const entity = entityRef(ctx, snap);
      const n = narrate("competitions.national_dominance", { entity: entity.name, season });
      out.push({
        id: `competitions:national:${entity.id}:${season}`,
        detector: "competitions",
        category: "competitions",
        type: "national_dominance",
        entity,
        season,
        importance: 55,
        confidence: 1,
        generatedAt: new Date().toISOString(),
        ...n,
        evidence: [{ metric: "ranking", current: 1, ref: snap.scopeRef ?? "national" }],
        data: { scope: "national", scopeRef: snap.scopeRef ?? null },
      });
    }
    for (const snap of leadersFor(ctx, "continental", season)) {
      const entity = entityRef(ctx, snap);
      const n = narrate("competitions.continental_dominance", { entity: entity.name, season });
      out.push({
        id: `competitions:continental:${entity.id}:${season}`,
        detector: "competitions",
        category: "competitions",
        type: "continental_dominance",
        entity,
        season,
        importance: 75,
        confidence: 1,
        generatedAt: new Date().toISOString(),
        ...n,
        evidence: [{ metric: "ranking", current: 1, ref: snap.scopeRef ?? "continental" }],
        data: { scope: "continental", scopeRef: snap.scopeRef ?? null },
      });
    }
    for (const snap of leadersFor(ctx, "global", season)) {
      const entity = entityRef(ctx, snap);
      const n = narrate("competitions.global_dominance", { entity: entity.name, season });
      out.push({
        id: `competitions:global:${entity.id}:${season}`,
        detector: "competitions",
        category: "competitions",
        type: "global_dominance",
        entity,
        season,
        importance: 90,
        confidence: 1,
        generatedAt: new Date().toISOString(),
        ...n,
        evidence: [{ metric: "ranking", current: 1, ref: "global" }],
        data: { scope: "global" },
      });
    }
    return out;
  },
};
