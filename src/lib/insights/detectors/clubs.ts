// Detector: clubes emergentes (subida consistente ao longo das últimas 3 épocas
// e ainda fora do Top 5).
import { groupRankingsByEntity } from "../context";
import { narrate } from "../narrative";
import type { Detector, Insight } from "../types";

export const clubsDetector: Detector = {
  id: "clubs",
  category: "clubs",
  run(ctx) {
    const out: Insight[] = [];
    const grouped = groupRankingsByEntity(ctx.rankings, "global");
    for (const [entityId, series] of grouped) {
      if (series.length < 3) continue;
      const last3 = series.slice(-3);
      const cur = last3[last3.length - 1];
      if (cur.entityKind !== "club") continue;
      const improving =
        last3[0].position > last3[1].position && last3[1].position > last3[2].position;
      if (improving && cur.position > 5) {
        const club = ctx.entities.clubs.find((c) => c.id === entityId);
        const entity = { kind: "club" as const, id: entityId, name: club?.name ?? entityId };
        const n = narrate("trends.emerging_club", { entity: entity.name });
        out.push({
          id: `clubs:emerging:${entityId}:${cur.season}`,
          detector: "clubs",
          category: "clubs",
          type: "emerging_club",
          entity,
          season: cur.season,
          importance: 65,
          confidence: 0.85,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [
            {
              metric: "ranking_trend",
              window: "3 épocas",
              previous: last3[0].position,
              current: cur.position,
              delta: last3[0].position - cur.position,
            },
          ],
          data: { positions: last3.map((s) => ({ season: s.season, position: s.position })) },
        });
      }
    }
    return out;
  },
};
