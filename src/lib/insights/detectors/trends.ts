// Detector: tendências agregadas (liga emergente, competição em declínio).
import { groupRankingsByEntity } from "../context";
import { narrate } from "../narrative";
import type { Detector, Insight } from "../types";

export const trendsDetector: Detector = {
  id: "trends",
  category: "trends",
  run(ctx) {
    const out: Insight[] = [];
    const compSeries = groupRankingsByEntity(ctx.rankings, "competition");

    for (const [entityId, series] of compSeries) {
      if (series.length < 3) continue;
      const cur = series[series.length - 1];
      const delta = series[0].position - cur.position;
      const comp = ctx.entities.competitions.find((c) => c.id === entityId);
      const entity = { kind: "competition" as const, id: entityId, name: comp?.name ?? entityId };

      if (delta >= 5) {
        const n = narrate("trends.emerging_league", { entity: entity.name });
        out.push({
          id: `trends:emerging_league:${entityId}:${cur.season}`,
          detector: "trends",
          category: "trends",
          type: "emerging_league",
          entity,
          season: cur.season,
          importance: 60,
          confidence: 0.8,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [
            { metric: "ranking", previous: series[0].position, current: cur.position, delta },
          ],
          data: { series: series.map((s) => ({ season: s.season, position: s.position })) },
        });
      } else if (delta <= -5) {
        const n = narrate("trends.declining_competition", { entity: entity.name });
        out.push({
          id: `trends:declining_competition:${entityId}:${cur.season}`,
          detector: "trends",
          category: "trends",
          type: "declining_competition",
          entity,
          season: cur.season,
          importance: 55,
          confidence: 0.8,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [
            { metric: "ranking", previous: series[0].position, current: cur.position, delta },
          ],
          data: { series: series.map((s) => ({ season: s.season, position: s.position })) },
        });
      }
    }
    return out;
  },
};
