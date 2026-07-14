// Detector: países em crescimento (soma agregada de melhorias dos seus clubes).
import { groupRankingsByEntity } from "../context";
import { narrate } from "../narrative";
import type { Detector, Insight, InsightContext } from "../types";

export const countriesDetector: Detector = {
  id: "countries",
  category: "countries",
  run(ctx) {
    const out: Insight[] = [];
    const clubSeries = groupRankingsByEntity(ctx.rankings, "global");
    const byCountry = new Map<string, { name: string; delta: number; clubs: number }>();

    for (const club of ctx.entities.clubs) {
      const country = club.country;
      if (!country) continue;
      const series = clubSeries.get(club.id);
      if (!series || series.length < 2) continue;
      const delta = series[0].position - series[series.length - 1].position;
      const bucket = byCountry.get(country) ?? { name: country, delta: 0, clubs: 0 };
      bucket.delta += delta;
      bucket.clubs += 1;
      byCountry.set(country, bucket);
    }

    for (const [countryId, b] of byCountry) {
      if (b.clubs < 3) continue;
      const avg = b.delta / b.clubs;
      if (avg >= 2) {
        const entityName = ctx.entities.countries.find((c) => c.id === countryId)?.name ?? b.name;
        const n = narrate("trends.rising_country", { entity: entityName });
        out.push({
          id: `countries:rising:${countryId}`,
          detector: "countries",
          category: "countries",
          type: "rising_country",
          entity: { kind: "country", id: countryId, name: entityName },
          season: ctx.season ?? null,
          importance: 55 + Math.min(Math.round(avg * 2), 25),
          confidence: 0.8,
          generatedAt: new Date().toISOString(),
          ...n,
          evidence: [
            {
              metric: "avg_delta_position",
              current: Number(avg.toFixed(2)),
              window: `${b.clubs} clubes`,
            },
          ],
          data: { avgDelta: avg, clubsConsidered: b.clubs },
        });
      }
    }
    return out;
  },
};
