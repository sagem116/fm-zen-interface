// Coach development metrics — Module 2 of Coach Identity.
// Pure compute over the coach's roster (already loaded by useCoachRoster).
import type { PlayerProfileRow } from "./data";

export interface PlayerCareerUnderCoach {
  key: string;
  name: string;
  idu: string | null;
  seasons: number;
  firstYear: number;
  lastYear: number;
  firstCa: number;
  lastCa: number;
  peakCa: number;
  caDelta: number;
  firstAge: number | null;
  lastAge: number | null;
  primaryPosition: string | null;
  vp: number | null;
  cp: number | null;
}

export interface DevelopmentMetrics {
  playersTracked: number;
  bestPlayer: PlayerCareerUnderCoach | null;
  biggestDelta: PlayerCareerUnderCoach | null;
  avgCaDelta: number;
  positiveDeltas: number;
  transformations: PlayerCareerUnderCoach[]; // CA<130 → CA>170
  youngDeveloped: PlayerCareerUnderCoach[]; // ≤21 at entry, +CA
  wonderkidUsageRate: number; // % of unique players ≤20 with high potential
  topRisers: PlayerCareerUnderCoach[]; // top 10 by delta
}

function pickNumber(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function computePlayerCareers(players: PlayerProfileRow[]): PlayerCareerUnderCoach[] {
  const byKey = new Map<string, PlayerProfileRow[]>();
  for (const p of players) {
    const key = p.idu ?? p.player_name;
    const list = byKey.get(key) ?? [];
    list.push(p);
    byKey.set(key, list);
  }
  const careers: PlayerCareerUnderCoach[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => (a.season_year ?? 0) - (b.season_year ?? 0));
    const first = list[0];
    const last = list[list.length - 1];
    const cas = list.map((x) => pickNumber(x.ca)).filter((v) => v > 0);
    const peakCa = cas.length ? Math.max(...cas) : 0;
    const firstCa = pickNumber(first.ca);
    const lastCa = pickNumber(last.ca);
    careers.push({
      key,
      name: first.player_name ?? last.player_name ?? key,
      idu: first.idu ?? last.idu ?? null,
      seasons: list.length,
      firstYear: first.season_year ?? 0,
      lastYear: last.season_year ?? 0,
      firstCa,
      lastCa,
      peakCa,
      caDelta: lastCa && firstCa ? lastCa - firstCa : 0,
      firstAge: first.age ?? null,
      lastAge: last.age ?? null,
      primaryPosition: first.primary_position ?? last.primary_position ?? null,
      vp: last.vp != null ? Number(last.vp) : null,
      cp: last.cp ?? first.cp ?? null,
    });
  }
  return careers;
}

export function computeDevelopment(players: PlayerProfileRow[]): DevelopmentMetrics {
  const careers = computePlayerCareers(players);
  const multi = careers.filter((c) => c.seasons >= 2 && c.firstCa > 0 && c.lastCa > 0);

  let bestPlayer: PlayerCareerUnderCoach | null = null;
  for (const c of careers) {
    if (!bestPlayer || c.peakCa > bestPlayer.peakCa) bestPlayer = c;
  }
  let biggestDelta: PlayerCareerUnderCoach | null = null;
  for (const c of multi) {
    if (!biggestDelta || c.caDelta > biggestDelta.caDelta) biggestDelta = c;
  }
  const deltas = multi.map((c) => c.caDelta);
  const avgCaDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const positiveDeltas = multi.filter((c) => c.caDelta > 0).length;
  const transformations = multi.filter((c) => c.firstCa < 130 && c.peakCa > 170);
  const youngDeveloped = multi
    .filter((c) => (c.firstAge ?? 99) <= 21 && c.caDelta >= 10)
    .sort((a, b) => b.caDelta - a.caDelta)
    .slice(0, 20);
  const wonderkidCount = careers.filter(
    (c) => (c.firstAge ?? 99) <= 20 && (c.cp ?? 0) - c.firstCa >= 30,
  ).length;
  const wonderkidUsageRate = careers.length ? (wonderkidCount / careers.length) * 100 : 0;
  const topRisers = [...multi].sort((a, b) => b.caDelta - a.caDelta).slice(0, 10);

  return {
    playersTracked: careers.length,
    bestPlayer,
    biggestDelta,
    avgCaDelta,
    positiveDeltas,
    transformations,
    youngDeveloped,
    wonderkidUsageRate,
    topRisers,
  };
}
