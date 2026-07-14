/**
 * Derived analytics over the OFFICIAL ranking output.
 *
 * These helpers are pure and read-only. They never recompute ranking
 * points — they simply summarise `ComputeResult` values (evolution
 * series, breakdown items, entries) already produced by the ranking
 * engine. If any derived number ever diverges from the official
 * `entry.raw` / `entry.weighted`, the caller must display the official
 * value; derived aggregates are informative only.
 */

import type { BreakdownItem, ComputeResult, RankingEntry } from "./fm-rankings";

export interface EntityStats {
  seasons: number; // seasons with data > 0
  first: number | null;
  last: number | null;
  best: { year: number; value: number } | null; // best single-season score
  worst: { year: number; value: number } | null; // worst single-season score
  peak: number; // == best.value (alias)
  avg: number; // arithmetic mean over active seasons
  total: number; // sum over active seasons (informative)
  lastValue: number;
  prevValue: number;
  deltaPrev: number; // last - prev
  deltaPeak: number; // last - peak (negative when below peak)
  trend: number; // slope of simple linear regression over active seasons
}

/** Compute per-entity statistics from an evolution series. */
export function entityStats(evo: Record<number, number> | undefined): EntityStats {
  const empty: EntityStats = {
    seasons: 0,
    first: null,
    last: null,
    best: null,
    worst: null,
    peak: 0,
    avg: 0,
    total: 0,
    lastValue: 0,
    prevValue: 0,
    deltaPrev: 0,
    deltaPeak: 0,
    trend: 0,
  };
  if (!evo) return empty;
  const pairs = Object.entries(evo)
    .map(([y, v]) => [Number(y), v] as const)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a - b);
  if (!pairs.length) return empty;

  let best = pairs[0],
    worst = pairs[0],
    total = 0;
  for (const p of pairs) {
    if (p[1] > best[1]) best = p;
    if (p[1] < worst[1]) worst = p;
    total += p[1];
  }
  const avg = total / pairs.length;
  const lastPair = pairs[pairs.length - 1];
  const prevPair = pairs.length > 1 ? pairs[pairs.length - 2] : null;

  // linear regression slope on (index, value)
  const n = pairs.length;
  let sx = 0,
    sy = 0,
    sxy = 0,
    sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += pairs[i][1];
    sxy += i * pairs[i][1];
    sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;

  return {
    seasons: n,
    first: pairs[0][0],
    last: lastPair[0],
    best: { year: best[0], value: best[1] },
    worst: { year: worst[0], value: worst[1] },
    peak: best[1],
    avg,
    total,
    lastValue: lastPair[1],
    prevValue: prevPair?.[1] ?? 0,
    deltaPrev: lastPair[1] - (prevPair?.[1] ?? 0),
    deltaPeak: lastPair[1] - best[1],
    trend: slope,
  };
}

/** Coefficient of variation (lower = more regular). Returns +Infinity when avg is 0. */
export function regularity(evo: Record<number, number> | undefined): number {
  const values = Object.values(evo ?? {}).filter((v) => v > 0);
  if (values.length < 2) return Infinity;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (!mean) return Infinity;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export interface MoverEntry {
  name: string;
  ptsDelta: number;
  rankDelta: number | null;
  lastYear: number;
  prevYear: number;
}

/** Ranks-by-year table computed from an evolution series (top score wins rank 1). */
export function ranksByYear(
  evolution: Record<string, Record<number, number>>,
  years: number[],
): Record<number, Record<string, number>> {
  const out: Record<number, Record<string, number>> = {};
  for (const y of years) {
    const pairs: [string, number][] = [];
    for (const name of Object.keys(evolution)) {
      const v = evolution[name]?.[y] ?? 0;
      if (v > 0) pairs.push([name, v]);
    }
    pairs.sort((a, b) => b[1] - a[1]);
    const m: Record<string, number> = {};
    pairs.forEach(([n], i) => (m[n] = i + 1));
    out[y] = m;
  }
  return out;
}

/** Movers between last two seasons with data (per entity). */
export function computeMovers(
  entries: RankingEntry[],
  evolution: Record<string, Record<number, number>>,
  years: number[],
): { risers: MoverEntry[]; fallers: MoverEntry[] } {
  const rbY = ranksByYear(evolution, years);
  const arr: MoverEntry[] = [];
  for (const e of entries) {
    const evo = evolution[e.name] ?? {};
    const active = years.filter((y) => (evo[y] ?? 0) > 0);
    if (active.length < 2) continue;
    const ly = active[active.length - 1];
    const py = active[active.length - 2];
    const rL = rbY[ly]?.[e.name] ?? null;
    const rP = rbY[py]?.[e.name] ?? null;
    arr.push({
      name: e.name,
      ptsDelta: (evo[ly] ?? 0) - (evo[py] ?? 0),
      rankDelta: rL !== null && rP !== null ? rP - rL : null,
      lastYear: ly,
      prevYear: py,
    });
  }
  const risers = [...arr]
    .filter((m) => (m.rankDelta ?? 0) > 0 || m.ptsDelta > 0)
    .sort((a, b) => (b.rankDelta ?? 0) - (a.rankDelta ?? 0) || b.ptsDelta - a.ptsDelta);
  const fallers = [...arr]
    .filter((m) => (m.rankDelta ?? 0) < 0 || m.ptsDelta < 0)
    .sort((a, b) => (a.rankDelta ?? 0) - (b.rankDelta ?? 0) || a.ptsDelta - b.ptsDelta);
  return { risers, fallers };
}

/** Peaks across the whole ranking (best single-season score per entity). */
export function computePeaks(
  entries: RankingEntry[],
  evolution: Record<string, Record<number, number>>,
): { name: string; year: number; value: number }[] {
  const out: { name: string; year: number; value: number }[] = [];
  for (const e of entries) {
    const evo = evolution[e.name] ?? {};
    let best = { y: 0, v: 0 };
    for (const [ys, v] of Object.entries(evo)) {
      if (v > best.v) best = { y: Number(ys), v };
    }
    if (best.v > 0) out.push({ name: e.name, year: best.y, value: best.v });
  }
  return out.sort((a, b) => b.value - a.value);
}

/** Ranking entries by regularity (only entities with >=3 active seasons considered). */
export function computeRegularity(
  entries: RankingEntry[],
  evolution: Record<string, Record<number, number>>,
): { name: string; cv: number; seasons: number }[] {
  const out: { name: string; cv: number; seasons: number }[] = [];
  for (const e of entries) {
    const evo = evolution[e.name] ?? {};
    const active = Object.values(evo).filter((v) => v > 0);
    if (active.length < 3) continue;
    out.push({ name: e.name, cv: regularity(evo), seasons: active.length });
  }
  return out.sort((a, b) => a.cv - b.cv);
}

/** Leadership changes per season (who was #1). */
export function leadershipChanges(
  evolution: Record<string, Record<number, number>>,
  years: number[],
): { year: number; leader: string; value: number; changed: boolean }[] {
  const rbY = ranksByYear(evolution, years);
  const sortedYears = [...years].sort((a, b) => a - b);
  const out: { year: number; leader: string; value: number; changed: boolean }[] = [];
  let prevLeader = "";
  for (const y of sortedYears) {
    const table = rbY[y] ?? {};
    let leader = "";
    for (const [n, r] of Object.entries(table))
      if (r === 1) {
        leader = n;
        break;
      }
    if (!leader) continue;
    const value = evolution[leader]?.[y] ?? 0;
    out.push({ year: y, leader, value, changed: leader !== prevLeader && prevLeader !== "" });
    prevLeader = leader;
  }
  return out;
}

/** Sustained trend: entities with positive slope over the last `window` seasons. */
export function sustainedTrend(
  entries: RankingEntry[],
  evolution: Record<string, Record<number, number>>,
  years: number[],
  window = 3,
  direction: "up" | "down" = "up",
): { name: string; slope: number; last: number; first: number }[] {
  const sortedY = [...years].sort((a, b) => a - b);
  const window_ = sortedY.slice(-window);
  if (window_.length < 2) return [];
  const out: { name: string; slope: number; last: number; first: number }[] = [];
  for (const e of entries) {
    const evo = evolution[e.name] ?? {};
    const vals = window_.map((y) => evo[y] ?? 0);
    if (vals.filter((v) => v > 0).length < 2) continue;
    // simple slope
    const n = vals.length;
    let sx = 0,
      sy = 0,
      sxy = 0,
      sxx = 0;
    for (let i = 0; i < n; i++) {
      sx += i;
      sy += vals[i];
      sxy += i * vals[i];
      sxx += i * i;
    }
    const denom = n * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    if (direction === "up" && slope > 0)
      out.push({ name: e.name, slope, last: vals[n - 1], first: vals[0] });
    if (direction === "down" && slope < 0)
      out.push({ name: e.name, slope, last: vals[n - 1], first: vals[0] });
  }
  return out.sort((a, b) => (direction === "up" ? b.slope - a.slope : a.slope - b.slope));
}

/** Dominance per competition, from breakdown items. */
export function dominanceByCompetition(
  breakdown: Record<string, BreakdownItem[]>,
): { competition: string; leader: string; leaderPts: number; totalPts: number; share: number }[] {
  // competition -> name -> weighted
  const map = new Map<string, Map<string, number>>();
  for (const [name, items] of Object.entries(breakdown)) {
    for (const it of items) {
      const comp = it.competition ?? competitionLabelOf(it);
      if (!comp) continue;
      let m = map.get(comp);
      if (!m) {
        m = new Map();
        map.set(comp, m);
      }
      m.set(name, (m.get(name) ?? 0) + it.weighted);
    }
  }
  const out: {
    competition: string;
    leader: string;
    leaderPts: number;
    totalPts: number;
    share: number;
  }[] = [];
  for (const [comp, m] of map) {
    let total = 0;
    let leader = "";
    let leaderPts = 0;
    for (const [n, v] of m) {
      total += v;
      if (v > leaderPts) {
        leaderPts = v;
        leader = n;
      }
    }
    if (total > 0)
      out.push({ competition: comp, leader, leaderPts, totalPts: total, share: leaderPts / total });
  }
  return out.sort((a, b) => b.share - a.share);
}

function competitionLabelOf(it: BreakdownItem): string {
  if (it.module === "superleague" && it.division_num)
    return `SuperLeague · Div. ${it.division_num}`;
  if (it.module === "national" && it.division_label) return it.division_label;
  return it.module === "continental" ? "Continental" : it.module;
}

/** Best single-season across the whole ranking. */
export function bestMoment(
  entries: RankingEntry[],
  evolution: Record<string, Record<number, number>>,
): { name: string; year: number; value: number } | null {
  let best: { name: string; year: number; value: number } | null = null;
  for (const e of entries) {
    const evo = evolution[e.name] ?? {};
    for (const [y, v] of Object.entries(evo)) {
      if (!best || v > best.value) best = { name: e.name, year: Number(y), value: v };
    }
  }
  return best;
}

/** Aggregate breakdown items per (competition, season) — used by Explain Mode. */
export interface BreakdownGroup {
  competition: string;
  season_year: number;
  module: BreakdownItem["module"];
  raw: number;
  weighted: number;
  compW: number;
  divW: number;
  decay: number;
  items: BreakdownItem[];
}

export function groupBreakdown(items: BreakdownItem[]): BreakdownGroup[] {
  const map = new Map<string, BreakdownGroup>();
  for (const it of items) {
    const comp = it.competition ?? competitionLabelOf(it);
    const key = `${it.season_year}|${comp}|${it.module}`;
    const cur = map.get(key);
    if (cur) {
      cur.raw += it.raw;
      cur.weighted += it.weighted;
      cur.items.push(it);
    } else {
      map.set(key, {
        competition: comp,
        season_year: it.season_year,
        module: it.module,
        raw: it.raw,
        weighted: it.weighted,
        compW: it.multipliers.compW,
        divW: it.multipliers.divW,
        decay: it.multipliers.decay,
        items: [it],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.season_year - a.season_year || b.weighted - a.weighted);
}

/** Contribution by competition (across all seasons) — leader-friendly. */
export function contributionByCompetition(
  items: BreakdownItem[],
): { competition: string; raw: number; weighted: number; share: number }[] {
  const map = new Map<string, { raw: number; weighted: number }>();
  let totalW = 0;
  for (const it of items) {
    const comp = it.competition ?? competitionLabelOf(it);
    const cur = map.get(comp) ?? { raw: 0, weighted: 0 };
    cur.raw += it.raw;
    cur.weighted += it.weighted;
    totalW += it.weighted;
    map.set(comp, cur);
  }
  return [...map.entries()]
    .map(([competition, v]) => ({
      competition,
      raw: v.raw,
      weighted: v.weighted,
      share: totalW ? v.weighted / totalW : 0,
    }))
    .sort((a, b) => b.weighted - a.weighted);
}

/** Sum bonuses vs base contributions from an entity breakdown. */
export function summariseSources(
  items: BreakdownItem[],
): Record<string, { raw: number; weighted: number; count: number }> {
  const out: Record<string, { raw: number; weighted: number; count: number }> = {};
  for (const it of items) {
    const cur = out[it.source] ?? { raw: 0, weighted: 0, count: 0 };
    cur.raw += it.raw;
    cur.weighted += it.weighted;
    cur.count += 1;
    out[it.source] = cur;
  }
  return out;
}

/** Total weighted seasons summed from breakdown (for divergence check with entry.weighted). */
export function totalWeightedFromBreakdown(items: BreakdownItem[]): number {
  let t = 0;
  for (const it of items) t += it.weighted;
  return t;
}

export function pickEntries(
  ranks: ComputeResult,
  kind: "clubes" | "treinadores" | "paises",
): RankingEntry[] {
  return kind === "clubes" ? ranks.clubs : kind === "treinadores" ? ranks.coaches : ranks.countries;
}

export function pickEvolution(
  ranks: ComputeResult,
  kind: "clubes" | "treinadores" | "paises",
): Record<string, Record<number, number>> {
  return kind === "clubes"
    ? ranks.evolution.clubs
    : kind === "treinadores"
      ? ranks.evolution.coaches
      : ranks.evolution.countries;
}

export function pickBreakdown(
  ranks: ComputeResult,
  kind: "clubes" | "treinadores" | "paises",
): Record<string, BreakdownItem[]> {
  return kind === "clubes"
    ? ranks.breakdown.clubs
    : kind === "treinadores"
      ? ranks.breakdown.coaches
      : ranks.breakdown.countries;
}
