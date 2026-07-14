// Detector: treinadores (dinastia, especialista europeu, recuperação, mudança clube).
// Usa entradas em ctx.records e metadados em ctx.entities.coaches.extra.

import { narrate } from "../narrative";
import type { Detector, Insight, InsightContext } from "../types";

function pushCoachInsight(
  out: Insight[],
  ctx: InsightContext,
  type: string,
  templateKey: Parameters<typeof narrate>[0],
  coachId: string,
  importance: number,
  vars: Record<string, string | number>,
  evidence: Insight["evidence"],
  data: Record<string, unknown>,
) {
  const coach = ctx.entities.coaches.find((c) => c.id === coachId);
  if (!coach) return;
  const entity = { kind: "coach" as const, id: coachId, name: coach.name };
  const n = narrate(templateKey, { entity: coach.name, ...vars });
  out.push({
    id: `coaches:${type}:${coachId}:${ctx.season ?? "all"}`,
    detector: "coaches",
    category: "coaches",
    type,
    entity,
    season: ctx.season ?? null,
    importance,
    confidence: 0.85,
    generatedAt: new Date().toISOString(),
    ...n,
    evidence,
    data,
  });
}

export const coachesDetector: Detector = {
  id: "coaches",
  category: "coaches",
  run(ctx) {
    const out: Insight[] = [];

    // Dinastia: coach com record "consecutive_seasons" >= 3
    for (const rec of ctx.records) {
      if (rec.entityKind !== "coach") continue;
      if (rec.metric === "consecutive_seasons" && rec.value >= 3) {
        pushCoachInsight(
          out,
          ctx,
          "dynasty",
          "coaches.dynasty",
          rec.entityId,
          80,
          { value: rec.value },
          [{ metric: "consecutive_seasons", current: rec.value }],
          { seasons: rec.value },
        );
      }
      if (rec.metric === "european_titles" && rec.value >= 2) {
        pushCoachInsight(
          out,
          ctx,
          "european_specialist",
          "coaches.european_specialist",
          rec.entityId,
          70,
          { value: rec.value },
          [{ metric: "european_titles", current: rec.value }],
          { titles: rec.value },
        );
      }
    }

    // Mudança de clube: metadados
    for (const coach of ctx.entities.coaches) {
      const changed = coach.extra?.club_change_season;
      if (changed && changed === ctx.season) {
        pushCoachInsight(
          out,
          ctx,
          "club_change",
          "coaches.club_change",
          coach.id,
          45,
          { season: String(ctx.season ?? "") },
          [{ metric: "club_change", ref: String(changed) }],
          { season: changed },
        );
      }
      const recovered = coach.extra?.recovery === true;
      if (recovered) {
        pushCoachInsight(
          out,
          ctx,
          "recovery",
          "coaches.recovery",
          coach.id,
          55,
          {},
          [{ metric: "recovery", current: 1 }],
          {},
        );
      }
    }
    return out;
  },
};
