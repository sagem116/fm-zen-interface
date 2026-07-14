// Shared per-entity Insight runner. Filters the global insight report by
// entity name so each profile shows only its own signals.

import { useEffect, useState } from "react";
import {
  buildContext,
  runEngine,
  type Insight,
  type RankingSnapshot,
  type EntityRow,
} from "@/lib/insights";
import type { ProfileContext, RankingsPayload } from "./types";

function buildSnapshots(
  kind: RankingSnapshot["entityKind"],
  evo: Record<string, Record<number, number>>,
): RankingSnapshot[] {
  const out: RankingSnapshot[] = [];
  const yearsSet = new Set<number>();
  for (const m of Object.values(evo)) for (const y of Object.keys(m)) yearsSet.add(Number(y));
  const years = [...yearsSet].sort((a, b) => a - b);
  for (const y of years) {
    const rows: Array<{ id: string; score: number }> = [];
    for (const [id, m] of Object.entries(evo)) {
      const v = m[y];
      if (typeof v === "number" && v > 0) rows.push({ id, score: v });
    }
    rows.sort((a, b) => b.score - a.score);
    rows.forEach((r, i) =>
      out.push({
        entityId: r.id,
        entityKind: kind,
        scope: "global",
        season: String(y),
        position: i + 1,
        score: r.score,
      }),
    );
  }
  return out;
}

function buildFullContext(payload: RankingsPayload) {
  const { data, ranks } = payload;
  const allClubs = Object.keys(data.clubCountry);
  const clubs: EntityRow[] = allClubs.map((name) => ({
    id: name,
    name,
    country: data.clubCountry[name] ?? null,
  }));
  const coachSet = new Set<string>();
  for (const c of data.coaches ?? []) if (c.name) coachSet.add(c.name);
  const coaches: EntityRow[] = [...coachSet].map((name) => ({ id: name, name }));
  const compSet = new Set<string>();
  for (const s of data.standings) if (s.competition) compSet.add(s.competition);
  const competitions: EntityRow[] = [...compSet].map((name) => ({ id: name, name }));
  const countrySet = new Set<string>();
  for (const c of Object.values(data.clubCountry)) if (c) countrySet.add(c);
  const countries: EntityRow[] = [...countrySet].map((name) => ({ id: name, name }));
  const playerSet = new Set<string>();
  for (const p of data.players ?? []) if (p.name) playerSet.add(p.name);
  const players: EntityRow[] = [...playerSet].map((n) => ({ id: n, name: n }));

  const snapshots: RankingSnapshot[] = [
    ...buildSnapshots("club", ranks.evolution.clubs),
    ...buildSnapshots("coach", ranks.evolution.coaches),
    ...buildSnapshots("country", ranks.evolution.countries),
  ];
  return buildContext({ rankings: snapshots, clubs, players, coaches, competitions, countries });
}

// Cache the full report keyed by payload identity — the same rankings query
// object shouldn't re-run the engine for each profile page.
const reportCache = new WeakMap<object, Insight[]>();

async function getReport(payload: RankingsPayload): Promise<Insight[]> {
  const cached = reportCache.get(payload as unknown as object);
  if (cached) return cached;
  const ctx = buildFullContext(payload);
  const r = await runEngine(ctx, { limit: 400 });
  reportCache.set(payload as unknown as object, r.insights);
  return r.insights;
}

export function useProfileInsights(ctx: ProfileContext): { insights: Insight[]; loading: boolean } {
  const [state, setState] = useState<{ insights: Insight[]; loading: boolean }>({
    insights: [],
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    setState({ insights: [], loading: true });
    getReport(ctx.data).then((all) => {
      if (!alive) return;
      const filtered = all.filter((i) => i.entity.kind === ctx.kind && i.entity.name === ctx.name);
      setState({ insights: filtered, loading: false });
    });
    return () => {
      alive = false;
    };
  }, [ctx.data, ctx.kind, ctx.name]);
  return state;
}
