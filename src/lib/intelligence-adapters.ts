/**
 * Adapters that shape existing app data into DomainEntity + cohort inputs
 * consumed by the Intelligence Engine. Read-only: no engine, ranking or
 * database logic is modified here.
 */
import type { AllData, PlayerRow } from "./fm-db";
import type { ComputeResult } from "./fm-rankings";
import type { DomainEntity, EntityKind } from "./intelligence";

export interface IntelligenceInputs {
  entity: DomainEntity;
  cohort: DomainEntity[];
}

function latestPlayerYear(players: PlayerRow[]): number {
  let m = 0;
  for (const p of players) if (p.season_year > m) m = p.season_year;
  return m;
}

function clubDomains(data: AllData): Map<string, DomainEntity> {
  const year = latestPlayerYear(data.players);
  const byClub = new Map<string, PlayerRow[]>();
  for (const p of data.players) {
    if (p.season_year !== year || !p.club_name) continue;
    const arr = byClub.get(p.club_name) ?? [];
    arr.push(p);
    byClub.set(p.club_name, arr);
  }
  const out = new Map<string, DomainEntity>();
  for (const [name, roster] of byClub) {
    const top = [...roster].sort((a, b) => b.ca - a.ca).slice(0, 28);
    const ages = top.map((p) => p.age).filter((v): v is number => typeof v === "number" && v > 0);
    const cas = top.map((p) => p.ca).filter((v) => v > 0);
    const cps = top.map((p) => p.cp).filter((v) => v > 0);
    out.set(name, {
      id: name,
      name,
      avgAge: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null,
      avgCA: cas.length ? cas.reduce((a, b) => a + b, 0) / cas.length : null,
      avgCP: cps.length ? cps.reduce((a, b) => a + b, 0) / cps.length : null,
    });
  }
  return out;
}

function playerDomains(data: AllData): Map<string, DomainEntity> {
  const year = latestPlayerYear(data.players);
  const byName = new Map<string, PlayerRow>();
  for (const p of data.players) {
    if (p.season_year !== year) continue;
    const key = p.idu ?? p.name;
    // Keep highest-CA record if the same key appears twice.
    const cur = byName.get(key);
    if (!cur || p.ca > cur.ca) byName.set(key, p);
  }
  const out = new Map<string, DomainEntity>();
  for (const [key, p] of byName) {
    out.set(p.name, {
      id: key,
      name: p.name,
      age: p.age ?? null,
      goals: p.gls,
      games: 1, // per-season proxy; goalsPerGame collapses to gls
      ca: p.ca,
    });
  }
  return out;
}

function coachDomains(data: AllData, ranks: ComputeResult): Map<string, DomainEntity> {
  const seasonsByCoach = new Map<string, Set<number>>();
  for (const c of data.coaches) {
    if (!c.name) continue;
    const s = seasonsByCoach.get(c.name) ?? new Set();
    s.add(c.season_year);
    seasonsByCoach.set(c.name, s);
  }
  const out = new Map<string, DomainEntity>();
  for (const r of ranks.coaches) {
    out.set(r.name, {
      id: r.name,
      name: r.name,
      titles: r.titles,
      seasons: seasonsByCoach.get(r.name)?.size ?? 0,
    });
  }
  return out;
}

function competitionDomains(data: AllData): Map<string, DomainEntity> {
  const names = new Set<string>();
  for (const s of data.standings) {
    if (s.competition) names.add(s.competition);
    else if (s.module === "superleague" && s.division_num) names.add(`Div. ${s.division_num}`);
    else if (s.division_label) names.add(s.division_label);
  }
  for (const c of data.continental) names.add(c.competition);
  for (const c of data.international ?? []) names.add(c.competition);

  // Aggregate goals/games per competition (from standings gf+ga / played).
  const agg = new Map<string, { goals: number; games: number }>();
  for (const s of data.standings) {
    const label =
      s.competition ??
      (s.module === "superleague" && s.division_num
        ? `Div. ${s.division_num}`
        : (s.division_label ?? null));
    if (!label) continue;
    const a = agg.get(label) ?? { goals: 0, games: 0 };
    a.goals += (Number(s.gf ?? 0) || 0) + (Number(s.ga ?? 0) || 0);
    a.games += Number(s.played ?? 0) || 0;
    agg.set(label, a);
  }
  const out = new Map<string, DomainEntity>();
  for (const name of names) {
    const a = agg.get(name);
    out.set(name, {
      id: name,
      name,
      goalsPerGame: a && a.games > 0 ? a.goals / a.games : null,
      avgReputation: null,
    });
  }
  return out;
}

function countryDomains(data: AllData, ranks: ComputeResult): Map<string, DomainEntity> {
  // playersAbroad ~ approximated by number of players whose club country != country name (latest year)
  const year = latestPlayerYear(data.players);
  const abroad = new Map<string, number>();
  for (const p of data.players) {
    if (p.season_year !== year || !p.club_name) continue;
    const cc = data.clubCountry[p.club_name];
    if (!cc) continue;
    // We can't know the player's own nationality from PlayerRow — leave as null everywhere.
    abroad.set(cc, (abroad.get(cc) ?? 0) + 0);
  }
  const out = new Map<string, DomainEntity>();
  for (const r of ranks.countries) {
    out.set(r.name, {
      id: r.name,
      name: r.name,
      internationalPoints: r.raw,
      playersAbroad: abroad.get(r.name) ?? null,
    });
  }
  return out;
}

const memo = new WeakMap<AllData, Partial<Record<EntityKind, Map<string, DomainEntity>>>>();

function domainsFor(
  kind: EntityKind,
  data: AllData,
  ranks: ComputeResult,
): Map<string, DomainEntity> {
  let bucket = memo.get(data);
  if (!bucket) {
    bucket = {};
    memo.set(data, bucket);
  }
  if (bucket[kind]) return bucket[kind]!;
  let m: Map<string, DomainEntity>;
  switch (kind) {
    case "club":
      m = clubDomains(data);
      break;
    case "player":
      m = playerDomains(data);
      break;
    case "coach":
      m = coachDomains(data, ranks);
      break;
    case "competition":
      m = competitionDomains(data);
      break;
    case "country":
      m = countryDomains(data, ranks);
      break;
  }
  bucket[kind] = m;
  return m;
}

export function buildIntelligenceInputs(
  kind: EntityKind,
  name: string,
  data: AllData,
  ranks: ComputeResult,
): IntelligenceInputs | null {
  const map = domainsFor(kind, data, ranks);
  const entity = map.get(name);
  if (!entity) return null;
  return { entity, cohort: [...map.values()] };
}

export function listEntityNames(kind: EntityKind, data: AllData, ranks: ComputeResult): string[] {
  return [...domainsFor(kind, data, ranks).keys()].sort((a, b) => a.localeCompare(b));
}
