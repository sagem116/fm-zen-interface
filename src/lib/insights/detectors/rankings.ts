// Detector: mudanças de ranking (líder, entradas/saídas Top 10, subidas/quedas,
// melhores/piores classificações históricas).

import { groupRankingsByEntity, lastTwo } from "../context";
import { narrate } from "../narrative";
import type { Detector, Insight, InsightContext, RankingSnapshot } from "../types";

function baseInsight(
  detector: string,
  type: string,
  category: Insight["category"],
  entity: Insight["entity"],
  season: string | null,
  importance: number,
  confidence: number,
): Omit<Insight, "title" | "description" | "evidence" | "data"> {
  return {
    id: `${detector}:${type}:${entity.id}:${season ?? "all"}`,
    detector,
    category,
    type,
    entity,
    season,
    importance,
    confidence,
    generatedAt: new Date().toISOString(),
  };
}

function entityRef(ctx: InsightContext, snap: RankingSnapshot): Insight["entity"] {
  const pool =
    snap.entityKind === "club"
      ? ctx.entities.clubs
      : snap.entityKind === "player"
        ? ctx.entities.players
        : snap.entityKind === "coach"
          ? ctx.entities.coaches
          : snap.entityKind === "competition"
            ? ctx.entities.competitions
            : snap.entityKind === "country"
              ? ctx.entities.countries
              : [];
  const found = pool.find((e) => e.id === snap.entityId);
  return { kind: snap.entityKind, id: snap.entityId, name: found?.name ?? snap.entityId };
}

export const rankingsDetector: Detector = {
  id: "rankings",
  category: "rankings",
  run(ctx) {
    const out: Insight[] = [];
    const byEntity = groupRankingsByEntity(ctx.rankings, "global");

    // Novo líder
    const globalBySeason = new Map<string, RankingSnapshot[]>();
    for (const r of ctx.rankings) {
      if (r.scope !== "global") continue;
      const arr = globalBySeason.get(r.season) ?? [];
      arr.push(r);
      globalBySeason.set(r.season, arr);
    }
    const orderedSeasons = Array.from(globalBySeason.keys()).sort();
    for (let i = 1; i < orderedSeasons.length; i++) {
      const prevSeason = orderedSeasons[i - 1];
      const curSeason = orderedSeasons[i];
      const prevLeader = (globalBySeason.get(prevSeason) ?? []).find((r) => r.position === 1);
      const curLeader = (globalBySeason.get(curSeason) ?? []).find((r) => r.position === 1);
      if (curLeader && prevLeader && curLeader.entityId !== prevLeader.entityId) {
        const entity = entityRef(ctx, curLeader);
        const n = narrate("rankings.new_leader", { entity: entity.name, season: curSeason });
        out.push({
          ...baseInsight("rankings", "new_leader", "rankings", entity, curSeason, 95, 1),
          ...n,
          evidence: [
            {
              metric: "ranking",
              previous: prevLeader.entityId,
              current: curLeader.entityId,
              ref: "position=1",
            },
          ],
          data: { previousLeaderId: prevLeader.entityId, currentLeaderId: curLeader.entityId },
        });
      }
    }

    // Por entidade: entrar/sair Top 10, maior subida/queda, melhor/pior histórica
    for (const [, series] of byEntity) {
      if (series.length < 1) continue;
      const { previous, current } = lastTwo(series);
      if (!current) continue;
      const entity = entityRef(ctx, current);

      if (previous) {
        const delta = previous.position - current.position; // positivo = subiu
        if (previous.position > 10 && current.position <= 10) {
          const n = narrate("rankings.enter_top10", {
            entity: entity.name,
            previous: previous.position,
            current: current.position,
          });
          out.push({
            ...baseInsight("rankings", "enter_top10", "rankings", entity, current.season, 80, 1),
            ...n,
            evidence: [
              { metric: "ranking", previous: previous.position, current: current.position, delta },
            ],
            data: { previous: previous.position, current: current.position, delta },
          });
        }
        if (previous.position <= 10 && current.position > 10) {
          const n = narrate("rankings.exit_top10", {
            entity: entity.name,
            previous: previous.position,
            current: current.position,
          });
          out.push({
            ...baseInsight("rankings", "exit_top10", "rankings", entity, current.season, 75, 1),
            ...n,
            evidence: [
              { metric: "ranking", previous: previous.position, current: current.position, delta },
            ],
            data: { previous: previous.position, current: current.position, delta },
          });
        }
        if (delta >= 10) {
          const n = narrate("rankings.biggest_rise", {
            entity: entity.name,
            previous: previous.position,
            current: current.position,
            delta,
          });
          out.push({
            ...baseInsight(
              "rankings",
              "biggest_rise",
              "rankings",
              entity,
              current.season,
              70 + Math.min(delta, 25),
              0.95,
            ),
            ...n,
            evidence: [
              { metric: "ranking", previous: previous.position, current: current.position, delta },
            ],
            data: { previous: previous.position, current: current.position, delta },
          });
        }
        if (delta <= -10) {
          const abs = Math.abs(delta);
          const n = narrate("rankings.biggest_fall", {
            entity: entity.name,
            previous: previous.position,
            current: current.position,
            delta: abs,
          });
          out.push({
            ...baseInsight(
              "rankings",
              "biggest_fall",
              "rankings",
              entity,
              current.season,
              65 + Math.min(abs, 25),
              0.95,
            ),
            ...n,
            evidence: [
              { metric: "ranking", previous: previous.position, current: current.position, delta },
            ],
            data: { previous: previous.position, current: current.position, delta },
          });
        }
      }

      // Melhor/pior histórica
      const positions = series.map((s) => s.position);
      const best = Math.min(...positions);
      const worst = Math.max(...positions);
      if (current.position === best && series.length >= 2) {
        const n = narrate("rankings.best_ever", {
          entity: entity.name,
          current: current.position,
          season: current.season,
        });
        out.push({
          ...baseInsight("rankings", "best_ever", "rankings", entity, current.season, 85, 1),
          ...n,
          evidence: [
            { metric: "ranking", current: current.position, window: `${series.length} épocas` },
          ],
          data: { position: current.position, seasonsObserved: series.length },
        });
      }
      if (current.position === worst && series.length >= 2 && best !== worst) {
        const n = narrate("rankings.worst_ever", {
          entity: entity.name,
          current: current.position,
          season: current.season,
        });
        out.push({
          ...baseInsight("rankings", "worst_ever", "rankings", entity, current.season, 60, 1),
          ...n,
          evidence: [
            { metric: "ranking", current: current.position, window: `${series.length} épocas` },
          ],
          data: { position: current.position, seasonsObserved: series.length },
        });
      }
    }

    return out;
  },
};
