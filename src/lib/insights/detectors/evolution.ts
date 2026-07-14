// Detector: evolução (crescimento/declínio sustentado, recuperação, estagnação).

import { groupRankingsByEntity } from "../context";
import { narrate } from "../narrative";
import type { Detector, Insight, InsightContext, RankingSnapshot } from "../types";

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

export const evolutionDetector: Detector = {
  id: "evolution",
  category: "evolution",
  run(ctx) {
    const out: Insight[] = [];
    const grouped = groupRankingsByEntity(ctx.rankings, "global");

    for (const [, series] of grouped) {
      if (series.length < 3) continue;
      const entity = entityRef(ctx, series[series.length - 1]);
      const season = series[series.length - 1].season;

      // Contar streaks a partir do fim
      let growth = 0;
      let decline = 0;
      for (let i = series.length - 1; i > 0; i--) {
        const delta = series[i - 1].position - series[i].position; // >0 subiu
        if (delta > 0 && decline === 0) growth++;
        else if (delta < 0 && growth === 0) decline++;
        else break;
      }

      const evidenceSeries = series.map((s) => ({
        metric: "ranking",
        season: s.season,
        position: s.position,
      }));

      if (growth >= 3) {
        const n = narrate("evolution.sustained_growth", {
          entity: entity.name,
          seasonsCount: growth,
        });
        out.push({
          id: `evolution:sustained_growth:${entity.id}:${season}`,
          detector: "evolution",
          category: "evolution",
          type: "sustained_growth",
          entity,
          season,
          importance: 70 + Math.min(growth * 2, 20),
          confidence: 0.9,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [{ metric: "ranking_trend", window: `${growth} épocas`, delta: growth }],
          data: { seasonsCount: growth, series: evidenceSeries },
        });
      } else if (decline >= 3) {
        const n = narrate("evolution.sustained_decline", {
          entity: entity.name,
          seasonsCount: decline,
        });
        out.push({
          id: `evolution:sustained_decline:${entity.id}:${season}`,
          detector: "evolution",
          category: "evolution",
          type: "sustained_decline",
          entity,
          season,
          importance: 60 + Math.min(decline * 2, 20),
          confidence: 0.9,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [{ metric: "ranking_trend", window: `${decline} épocas`, delta: -decline }],
          data: { seasonsCount: decline, series: evidenceSeries },
        });
      } else {
        // Recuperação: caiu depois subiu significativamente
        const midMax = Math.max(...series.slice(0, -1).map((s) => s.position));
        const cur = series[series.length - 1].position;
        const recovery = midMax - cur;
        if (recovery >= 8 && midMax > 15) {
          const n = narrate("evolution.recovery", { entity: entity.name, delta: recovery });
          out.push({
            id: `evolution:recovery:${entity.id}:${season}`,
            detector: "evolution",
            category: "evolution",
            type: "recovery",
            entity,
            season,
            importance: 65,
            confidence: 0.85,
            generatedAt: new Date().toISOString(),
            ...n,
            evidence: [{ metric: "ranking", previous: midMax, current: cur, delta: recovery }],
            data: { valley: midMax, current: cur, delta: recovery, series: evidenceSeries },
          });
        } else {
          // Estagnação: variação inferior a 2 posições em >=4 épocas
          const recent = series.slice(-4);
          if (recent.length === 4) {
            const positions = recent.map((s) => s.position);
            const range = Math.max(...positions) - Math.min(...positions);
            if (range <= 2) {
              const n = narrate("evolution.stagnation", {
                entity: entity.name,
                seasonsCount: recent.length,
              });
              out.push({
                id: `evolution:stagnation:${entity.id}:${season}`,
                detector: "evolution",
                category: "evolution",
                type: "stagnation",
                entity,
                season,
                importance: 40,
                confidence: 0.8,
                generatedAt: new Date().toISOString(),
                ...n,
                evidence: [
                  { metric: "ranking_range", window: `${recent.length} épocas`, delta: range },
                ],
                data: { range, series: evidenceSeries.slice(-4) },
              });
            }
          }
        }
      }
    }
    return out;
  },
};
