// Coach identity engine: computes squad profile + play style + tactical tags
// from player_profiles data. Purely rule-based, no AI.

import { parsePrimaryPosition, type PositionGroup, type PositionDetail } from "./positions";
import type { PlayerProfileRow, CoachAssignmentLite, UniverseData } from "./data";

// ---------- Types ----------
export interface Bucket<T extends string> {
  key: T;
  label: string;
  count: number;
  pct: number;
}

export interface StyleIndicator {
  id: string;
  label: string;
  value: number; // 0-100 (attribute-based) or raw ratio
  percentile: number; // 0-100 vs universe
  classification: "Muito Baixo" | "Baixo" | "Médio" | "Alto" | "Muito Alto";
  evolution: Array<{ year: number; value: number }>;
}

export interface SquadProfile {
  playersUsed: number;
  seasons: number;
  avgAge: number;
  ageDistribution: Bucket<"18-20" | "21-24" | "25-28" | "29-32" | "33+">[];
  ageEvolution: Array<{ year: number; avgAge: number }>;
  nationalities: Bucket<string>[];
  continents: Bucket<string>[];
  positionsGroup: Bucket<PositionGroup>[];
  positionsDetail: Bucket<PositionDetail>[];
  feet: { right: number; left: number; ambi: number };
  avgHeight: number;
  avgWeight: number;
  avgValue: number;
  avgCa: number;
  avgPa: number;
  avgReputation: number;
}

export interface TacticalTag {
  id: string;
  label: string;
  category: string;
  active: boolean;
  reason: string;
  metric?: { label: string; value: string };
}

// ---------- Helpers ----------
function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
function attr(p: PlayerProfileRow, key: string): number | null {
  const v = p.attributes?.[`player.attribute.${key}`];
  return typeof v === "number" ? v : null;
}
function attrMean(players: PlayerProfileRow[], keys: string[]): number {
  const vals: number[] = [];
  for (const p of players) {
    for (const k of keys) {
      const v = attr(p, k);
      if (v != null) vals.push(v);
    }
  }
  return mean(vals);
}

function ageBucket(age: number | null): "18-20" | "21-24" | "25-28" | "29-32" | "33+" | null {
  if (age == null || age < 15) return null;
  if (age <= 20) return "18-20";
  if (age <= 24) return "21-24";
  if (age <= 28) return "25-28";
  if (age <= 32) return "29-32";
  return "33+";
}

function toBuckets<T extends string>(
  counts: Map<T, number>,
  total: number,
  labelFn: (k: T) => string,
  order?: T[],
): Bucket<T>[] {
  const keys = order ?? [...counts.keys()];
  const list: Bucket<T>[] = keys.map((k) => ({
    key: k,
    label: labelFn(k),
    count: counts.get(k) ?? 0,
    pct: total > 0 ? ((counts.get(k) ?? 0) / total) * 100 : 0,
  }));
  if (!order) list.sort((a, b) => b.count - a.count);
  return list;
}

// ---------- Squad profile ----------
export function computeSquadProfile(
  players: PlayerProfileRow[],
  assignments: CoachAssignmentLite[],
): SquadProfile {
  const uniqueSeasons = new Set(assignments.map((a) => a.season_year)).size;
  // Deduplicate players by idu (or name) across seasons for headcount aggregates
  const byPlayer = new Map<string, PlayerProfileRow[]>();
  for (const p of players) {
    const key = p.idu ?? p.player_name;
    const list = byPlayer.get(key) ?? [];
    list.push(p);
    byPlayer.set(key, list);
  }
  // For "utilized profile" aggregate we use latest snapshot per player
  const latest: PlayerProfileRow[] = [];
  for (const list of byPlayer.values()) {
    list.sort((a, b) => (b.season_year ?? 0) - (a.season_year ?? 0));
    latest.push(list[0]);
  }

  const ages = latest.map((p) => p.age).filter((a): a is number => a != null);
  const ageCounts = new Map<
    "18-20" | "21-24" | "25-28" | "29-32" | "33+",
    number
  >();
  for (const a of ages) {
    const b = ageBucket(a);
    if (b) ageCounts.set(b, (ageCounts.get(b) ?? 0) + 1);
  }

  // Age evolution per year (all players in that season)
  const bySeason = new Map<number, PlayerProfileRow[]>();
  for (const p of players) {
    if (!p.season_year) continue;
    const list = bySeason.get(p.season_year) ?? [];
    list.push(p);
    bySeason.set(p.season_year, list);
  }
  const ageEvolution = [...bySeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, list]) => ({
      year,
      avgAge: mean(list.map((p) => p.age ?? 0).filter((v) => v > 0)),
    }));

  const natCounts = new Map<string, number>();
  const contCounts = new Map<string, number>();
  for (const p of latest) {
    if (p.nationality) natCounts.set(p.nationality, (natCounts.get(p.nationality) ?? 0) + 1);
    if (p.continent) contCounts.set(p.continent, (contCounts.get(p.continent) ?? 0) + 1);
  }

  // Positions
  const grpCounts = new Map<PositionGroup, number>();
  const detCounts = new Map<PositionDetail, number>();
  for (const p of latest) {
    const pos = parsePrimaryPosition(p.primary_position);
    grpCounts.set(pos.group, (grpCounts.get(pos.group) ?? 0) + 1);
    for (const d of pos.details) {
      detCounts.set(d, (detCounts.get(d) ?? 0) + 1);
    }
  }

  // Feet
  let right = 0,
    left = 0,
    ambi = 0;
  for (const p of latest) {
    const f = (p.preferred_foot ?? "").toLowerCase();
    if (f.includes("ambi") || f.includes("both") || f.includes("dois")) ambi++;
    else if (f.includes("esq") || f.includes("left") || f.includes("l")) left++;
    else if (f.includes("dir") || f.includes("right") || f.includes("r")) right++;
  }

  const total = latest.length || 1;
  return {
    playersUsed: latest.length,
    seasons: uniqueSeasons,
    avgAge: mean(ages),
    ageDistribution: toBuckets(
      ageCounts,
      total,
      (k) => k,
      ["18-20", "21-24", "25-28", "29-32", "33+"],
    ),
    ageEvolution,
    nationalities: toBuckets(natCounts, total, (k) => k).slice(0, 15),
    continents: toBuckets(contCounts, total, (k) => k),
    positionsGroup: toBuckets(
      grpCounts,
      total,
      (k) => ({ GK: "Guarda-redes", DEF: "Defesas", MID: "Médios", ATT: "Avançados" })[k],
      ["GK", "DEF", "MID", "ATT"] as PositionGroup[],
    ),
    positionsDetail: toBuckets(
      detCounts,
      total,
      (k) =>
        ({
          GK: "Guarda-redes",
          CB: "Centrais",
          FB: "Laterais",
          DM: "Médios defensivos",
          CM: "Médios",
          AM: "Médios ofensivos",
          WING: "Extremos",
          ST: "Pontas de lança",
        })[k],
    ),
    feet: {
      right: total > 0 ? (right / total) * 100 : 0,
      left: total > 0 ? (left / total) * 100 : 0,
      ambi: total > 0 ? (ambi / total) * 100 : 0,
    },
    avgHeight: mean(latest.map((p) => p.height ?? 0).filter((v) => v > 0)),
    avgWeight: mean(latest.map((p) => p.weight ?? 0).filter((v) => v > 0)),
    avgValue: mean(latest.map((p) => Number(p.vp) || 0).filter((v) => v > 0)),
    avgCa: mean(latest.map((p) => p.ca ?? 0).filter((v) => v > 0)),
    avgPa: mean(latest.map((p) => p.cp ?? 0).filter((v) => v > 0)),
    avgReputation: mean(latest.map((p) => p.reputation ?? 0).filter((v) => v > 0)),
  };
}

// ---------- Play style computation ----------
// Each style indicator maps to attribute proxies + composition ratios (0-100 scale).

interface StyleDef {
  id: string;
  label: string;
  compute: (players: PlayerProfileRow[]) => number;
}

function ratioWide(players: PlayerProfileRow[]): number {
  if (!players.length) return 0;
  const wide = players.filter((p) => parsePrimaryPosition(p.primary_position).isWide).length;
  return (wide / players.length) * 100;
}
function ratioCentralAtt(players: PlayerProfileRow[]): number {
  if (!players.length) return 0;
  const central = players.filter((p) => {
    const pos = parsePrimaryPosition(p.primary_position);
    return pos.group === "ATT" && !pos.isWide;
  }).length;
  return (central / players.length) * 100;
}
function ratioYoung(players: PlayerProfileRow[]): number {
  if (!players.length) return 0;
  return (players.filter((p) => (p.age ?? 99) < 23).length / players.length) * 100;
}
function ratioVeteran(players: PlayerProfileRow[]): number {
  if (!players.length) return 0;
  return (players.filter((p) => (p.age ?? 0) >= 30).length / players.length) * 100;
}
function scale20(v: number): number {
  // FM attrs on 1-20 → 0-100
  return Math.max(0, Math.min(100, (v / 20) * 100));
}

export const STYLE_DEFS: StyleDef[] = [
  {
    id: "possession",
    label: "Posse de bola",
    compute: (p) => scale20(attrMean(p, ["passing", "first_touch", "composure"])),
  },
  {
    id: "direct",
    label: "Jogo direto",
    compute: (p) => scale20(attrMean(p, ["long_shots", "heading", "kicking"])),
  },
  {
    id: "counter",
    label: "Contra-ataque",
    compute: (p) => scale20(attrMean(p, ["pace", "acceleration", "off_the_ball"])),
  },
  {
    id: "high_press",
    label: "Pressão alta",
    compute: (p) => scale20(attrMean(p, ["stamina", "aggression", "hidden_pres"])),
  },
  {
    id: "low_block",
    label: "Bloco baixo",
    compute: (p) => scale20(attrMean(p, ["marking", "tackling", "concentration", "positioning"])),
  },
  {
    id: "short_build",
    label: "Construção curta",
    compute: (p) => scale20(attrMean(p, ["passing", "technique", "decisions", "vision"])),
  },
  {
    id: "crossing",
    label: "Cruzamentos",
    compute: (p) => scale20(attrMean(p, ["crossing"])),
  },
  {
    id: "central_att",
    label: "Ataque pelo centro",
    compute: (p) => ratioCentralAtt(p),
  },
  {
    id: "wide_att",
    label: "Ataque pelas alas",
    compute: (p) => ratioWide(p),
  },
  {
    id: "def_intensity",
    label: "Intensidade defensiva",
    compute: (p) => scale20(attrMean(p, ["tackling", "aggression", "bravery", "strength"])),
  },
  {
    id: "rotation",
    label: "Rotação do plantel",
    compute: (p) => {
      // Unique players / seasons ratio (proxy)
      if (!p.length) return 0;
      const seasons = new Set(p.map((x) => x.season_year)).size || 1;
      const unique = new Set(p.map((x) => x.idu ?? x.player_name)).size;
      const ratio = unique / seasons; // ~squad size per season; typical 20-30
      return Math.max(0, Math.min(100, ((ratio - 15) / 25) * 100));
    },
  },
  {
    id: "youth_usage",
    label: "Utilização de jovens",
    compute: (p) => ratioYoung(p),
  },
  {
    id: "veteran_pref",
    label: "Preferência por veteranos",
    compute: (p) => ratioVeteran(p),
  },
];

function classifyPct(p: number): StyleIndicator["classification"] {
  if (p >= 85) return "Muito Alto";
  if (p >= 65) return "Alto";
  if (p >= 35) return "Médio";
  if (p >= 15) return "Baixo";
  return "Muito Baixo";
}

function percentileOf(value: number, dist: number[]): number {
  if (!dist.length) return 50;
  let below = 0;
  for (const v of dist) if (v < value) below++;
  return (below / dist.length) * 100;
}

export function computeStyleIndicators(
  players: PlayerProfileRow[],
  universe: UniverseData | undefined,
): StyleIndicator[] {
  // Precompute universe distribution per style id
  const dists = new Map<string, number[]>();
  if (universe) {
    for (const def of STYLE_DEFS) dists.set(def.id, []);
    for (const [, coachPlayers] of universe.playersByCoach) {
      if (coachPlayers.length < 5) continue;
      for (const def of STYLE_DEFS) {
        dists.get(def.id)!.push(def.compute(coachPlayers));
      }
    }
  }

  // Evolution: compute per-season for the current coach
  const bySeason = new Map<number, PlayerProfileRow[]>();
  for (const p of players) {
    if (!p.season_year) continue;
    const list = bySeason.get(p.season_year) ?? [];
    list.push(p);
    bySeason.set(p.season_year, list);
  }
  const seasonKeys = [...bySeason.keys()].sort((a, b) => a - b);

  return STYLE_DEFS.map((def) => {
    const value = def.compute(players);
    const percentile = percentileOf(value, dists.get(def.id) ?? []);
    const evolution = seasonKeys.map((year) => ({
      year,
      value: def.compute(bySeason.get(year) ?? []),
    }));
    return {
      id: def.id,
      label: def.label,
      value,
      percentile,
      classification: classifyPct(percentile),
      evolution,
    };
  });
}

// ---------- Tactical identity tags (Module 4) ----------
export function computeTacticalTags(
  players: PlayerProfileRow[],
  assignments: CoachAssignmentLite[],
  squad: SquadProfile,
  style: StyleIndicator[],
  universe: UniverseData | undefined,
): TacticalTag[] {
  const tags: TacticalTag[] = [];
  const uniquePlayers = new Set(players.map((p) => p.idu ?? p.player_name)).size;
  const seasons = squad.seasons || 1;
  const squadPerSeason = uniquePlayers / seasons;

  tags.push({
    id: "narrow_squad",
    label: "Utiliza plantéis curtos",
    category: "Plantel",
    active: squadPerSeason < 22,
    reason: `Média de ${squadPerSeason.toFixed(1)} jogadores distintos por época`,
    metric: { label: "Jogadores/época", value: squadPerSeason.toFixed(1) },
  });
  tags.push({
    id: "wide_squad",
    label: "Utiliza plantéis largos",
    category: "Plantel",
    active: squadPerSeason >= 27,
    reason: `Média de ${squadPerSeason.toFixed(1)} jogadores distintos por época`,
    metric: { label: "Jogadores/época", value: squadPerSeason.toFixed(1) },
  });

  const youthUsage = style.find((s) => s.id === "youth_usage")?.value ?? 0;
  tags.push({
    id: "promotes_youth",
    label: "Promove jovens",
    category: "Formação",
    active: youthUsage >= 30,
    reason: `${youthUsage.toFixed(0)}% dos jogadores utilizados têm menos de 23 anos`,
    metric: { label: "% <23 anos", value: `${youthUsage.toFixed(0)}%` },
  });
  const vetPref = style.find((s) => s.id === "veteran_pref")?.value ?? 0;
  tags.push({
    id: "buys_experience",
    label: "Compra experiência",
    category: "Formação",
    active: vetPref >= 25,
    reason: `${vetPref.toFixed(0)}% dos jogadores utilizados têm 30 anos ou mais`,
    metric: { label: "% ≥30 anos", value: `${vetPref.toFixed(0)}%` },
  });

  // Recuperar jogadores → média CA baixa mas plantel produtivo (proxy: avgCa moderate)
  tags.push({
    id: "player_reviver",
    label: "Especialista em recuperar jogadores",
    category: "Desenvolvimento",
    active: squad.avgCa > 0 && squad.avgCa < 130,
    reason: `CA médio do plantel de ${squad.avgCa.toFixed(0)} indica jogadores com margem de crescimento`,
    metric: { label: "CA médio", value: squad.avgCa.toFixed(0) },
  });

  // Desenvolver talento — proxy: PA alto vs CA médio
  const gap = squad.avgPa - squad.avgCa;
  tags.push({
    id: "talent_developer",
    label: "Especialista em desenvolver talento",
    category: "Desenvolvimento",
    active: gap > 20,
    reason: `Diferença média PA-CA de +${gap.toFixed(0)} sugere plantel com potencial por explorar`,
    metric: { label: "Δ PA-CA", value: `+${gap.toFixed(0)}` },
  });

  // Grandes clubes / clubes pequenos — proxy: reputation média
  tags.push({
    id: "elite_clubs",
    label: "Especialista em grandes clubes",
    category: "Contexto",
    active: squad.avgReputation >= 7000,
    reason: `Reputação média dos jogadores ${squad.avgReputation.toFixed(0)} — típica de plantéis de topo`,
    metric: { label: "Reputação média", value: squad.avgReputation.toFixed(0) },
  });
  tags.push({
    id: "small_clubs",
    label: "Especialista em clubes pequenos",
    category: "Contexto",
    active: squad.avgReputation > 0 && squad.avgReputation < 4000,
    reason: `Reputação média dos jogadores ${squad.avgReputation.toFixed(0)} — plantéis modestos`,
    metric: { label: "Reputação média", value: squad.avgReputation.toFixed(0) },
  });

  // Continental / national specialist — module breakdown
  const modCounts = new Map<string, number>();
  for (const a of assignments) modCounts.set(a.module, (modCounts.get(a.module) ?? 0) + 1);
  const total = assignments.length || 1;
  const contPct = ((modCounts.get("continental") ?? 0) / total) * 100;
  const nationalPct = (((modCounts.get("national") ?? 0) + (modCounts.get("superleague") ?? 0)) / total) * 100;
  tags.push({
    id: "continental_specialist",
    label: "Especialista em competições continentais",
    category: "Contexto",
    active: contPct >= 20,
    reason: `${contPct.toFixed(0)}% da carreira em competições continentais`,
    metric: { label: "% continental", value: `${contPct.toFixed(0)}%` },
  });
  tags.push({
    id: "national_specialist",
    label: "Especialista em ligas nacionais",
    category: "Contexto",
    active: nationalPct >= 70,
    reason: `${nationalPct.toFixed(0)}% da carreira em ligas nacionais`,
    metric: { label: "% nacional", value: `${nationalPct.toFixed(0)}%` },
  });

  // Placeholders for transfer-based tags (Phase B) — off for now
  void universe;
  return tags;
}
