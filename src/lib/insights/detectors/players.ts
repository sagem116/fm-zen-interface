// Detector: jogadores (revelação, melhor evolução, pico, declínio).
import { groupRankingsByEntity } from "../context";
import { narrate } from "../narrative";
import type { Detector, Insight } from "../types";

export const playersDetector: Detector = {
  id: "players",
  category: "players",
  run(ctx) {
    const out: Insight[] = [];
    const grouped = groupRankingsByEntity(ctx.rankings, "global");

    let bestEvolution: { id: string; delta: number; name: string; season: string } | null = null;

    for (const [entityId, series] of grouped) {
      const cur = series[series.length - 1];
      if (cur.entityKind !== "player") continue;
      const player = ctx.entities.players.find((p) => p.id === entityId);
      const entity = { kind: "player" as const, id: entityId, name: player?.name ?? entityId };

      // Revelação: primeira aparição no Top 50 nesta última época
      if (series.length === 1 && cur.position <= 50) {
        const n = narrate("players.revelation", { entity: entity.name, season: cur.season });
        out.push({
          id: `players:revelation:${entityId}:${cur.season}`,
          detector: "players",
          category: "players",
          type: "revelation",
          entity,
          season: cur.season,
          importance: 70,
          confidence: 0.9,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [{ metric: "ranking", current: cur.position, window: "1 época" }],
          data: { position: cur.position },
        });
      }

      // Pico: melhor posição de sempre atingida agora
      if (series.length >= 2) {
        const best = Math.min(...series.map((s) => s.position));
        if (cur.position === best) {
          const n = narrate("players.career_peak", { entity: entity.name, season: cur.season });
          out.push({
            id: `players:career_peak:${entityId}:${cur.season}`,
            detector: "players",
            category: "players",
            type: "career_peak",
            entity,
            season: cur.season,
            importance: 65,
            confidence: 0.9,
            generatedAt: new Date().toISOString(),
            ...n,
            evidence: [
              { metric: "ranking", current: cur.position, window: `${series.length} épocas` },
            ],
            data: { position: cur.position, seasonsObserved: series.length },
          });
        }
      }

      // Declínio: piorou em pelo menos 20 posições em relação ao melhor
      if (series.length >= 2) {
        const best = Math.min(...series.map((s) => s.position));
        if (cur.position - best >= 20) {
          const n = narrate("players.decline", { entity: entity.name });
          out.push({
            id: `players:decline:${entityId}:${cur.season}`,
            detector: "players",
            category: "players",
            type: "decline",
            entity,
            season: cur.season,
            importance: 55,
            confidence: 0.8,
            generatedAt: new Date().toISOString(),
            ...n,
            evidence: [
              {
                metric: "ranking",
                previous: best,
                current: cur.position,
                delta: best - cur.position,
              },
            ],
            data: { bestEver: best, current: cur.position },
          });
        }
      }

      // Candidato a melhor evolução
      if (series.length >= 2) {
        const delta = series[0].position - cur.position;
        if (delta > 0 && (!bestEvolution || delta > bestEvolution.delta)) {
          bestEvolution = { id: entityId, delta, name: entity.name, season: cur.season };
        }
      }
    }

    if (bestEvolution) {
      const entity = { kind: "player" as const, id: bestEvolution.id, name: bestEvolution.name };
      const n = narrate("players.best_evolution", { entity: entity.name });
      out.push({
        id: `players:best_evolution:${bestEvolution.id}:${bestEvolution.season}`,
        detector: "players",
        category: "players",
        type: "best_evolution",
        entity,
        season: bestEvolution.season,
        importance: 75,
        confidence: 0.9,
        generatedAt: new Date().toISOString(),
        ...n,
        evidence: [{ metric: "ranking_delta", delta: bestEvolution.delta }],
        data: { delta: bestEvolution.delta },
      });
    }

    return out;
  },
};
