// Competition Market — data loader for the Transfer Market module on
// the competition profile. Fase A: fluxo global, origem, destino, clubes ativos.
// Deterministic; no AI. All computed from `transfers` + supporting tables.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RawTransfer {
  season_year: number | null;
  person_name: string;
  from_club_name: string | null;
  to_club_name: string | null;
  value: number | null;
}
export interface RawStanding {
  season_year: number;
  module: string;
  competition: string | null;
  division_label: string | null;
  division_num: number | null;
  club_name: string | null;
}
export interface RawContinental {
  season_year: number;
  competition: string | null;
  team1: string | null;
  team2: string | null;
  sf1: string | null;
  sf2: string | null;
  qf1: string | null;
  qf2: string | null;
  qf3: string | null;
  qf4: string | null;
}
export interface RawInternational {
  season_year: number;
  competition: string | null;
  team1: string | null;
  team2: string | null;
}
export interface RawCoachAssign {
  season_year: number;
  module: string;
  club_name: string | null;
  country_name: string | null;
}

export function normKey(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}
export function seasonClubKey(club: string | null | undefined, year: number | null | undefined) {
  return `${normKey(club)}::${year ?? 0}`;
}

export interface PlayerSnapshot {
  nationality: string | null;
  continent: string | null;
  age: number | null;
  ca: number | null;
  vp: number | null;
  salary: number | null;
  reputation: number | null;
  primary_position: string | null;
  personality: string | null;
  preferred_foot: string | null;
  height: number | null;
}

export interface CompetitionMarketData {
  competition: string;
  // Members: clubs that belong to the competition, per season
  members: Array<{ club_name: string; season_year: number }>;
  memberKeys: Set<string>; // Set of "clubKey::year"
  memberClubsAllTime: Set<string>; // Set of normalized club names ever in the competition
  transfers: RawTransfer[]; // only transfers touching a member club in its member season
  // Club catalog: (norm club, year) → { country, competition, division_num }
  clubCatalog: Map<
    string,
    { country: string | null; competition: string | null; division_num: number | null; module: string | null }
  >;
  // Player enrichment: nameKey::year → snapshot
  playerIndex: Map<string, PlayerSnapshot>;
  seasons: number[]; // seasons the competition existed
}

export function playerKey(name: string | null | undefined, year: number | null | undefined) {
  return `${normKey(name)}::${year ?? 0}`;
}

async function fetchAllMembership(): Promise<{
  standings: RawStanding[];
  continental: RawContinental[];
  international: RawInternational[];
  coaches: RawCoachAssign[];
  transfers: RawTransfer[];
  clubCountryByName: Map<string, string>; // normKey(club) → country name
}> {
  const [
    { data: seasonsRows },
    { data: standingsRaw },
    { data: continentalRaw },
    { data: internationalRaw },
    { data: coachesRaw },
    { data: transfersRaw },
    { data: countriesRaw },
    { data: clubsRaw },
  ] = (await Promise.all([
    supabase.from("seasons").select("id, year"),
    supabase
      .from("standings")
      .select("season_id, module, competition, division_label, division_num, club_name"),
    supabase
      .from("continental_results")
      .select("season_id, competition, team1, team2, sf1, sf2, qf1, qf2, qf3, qf4"),
    supabase.from("international_results").select("season_id, competition, team1, team2"),
    supabase.from("coach_assignments").select("season_id, module, club_name, country_name"),
    supabase
      .from("transfers")
      .select("season_year, person_name, from_club_name, to_club_name, value, person_type")
      .eq("person_type", "player"),
    supabase.from("countries").select("id, name"),
    supabase.from("clubs").select("name, country_id"),
  ])) as unknown as [
    { data: Array<{ id: string; year: number }> | null },
    {
      data: Array<{
        season_id: string;
        module: string;
        competition: string | null;
        division_label: string | null;
        division_num: number | null;
        club_name: string | null;
      }> | null;
    },
    {
      data: Array<{
        season_id: string;
        competition: string | null;
        team1: string | null;
        team2: string | null;
        sf1: string | null;
        sf2: string | null;
        qf1: string | null;
        qf2: string | null;
        qf3: string | null;
        qf4: string | null;
      }> | null;
    },
    {
      data: Array<{
        season_id: string;
        competition: string | null;
        team1: string | null;
        team2: string | null;
      }> | null;
    },
    {
      data: Array<{
        season_id: string;
        module: string;
        club_name: string | null;
        country_name: string | null;
      }> | null;
    },
    { data: Array<RawTransfer & { person_type: string }> | null },
  ];
  const yearById = new Map<string, number>();
  for (const s of seasonsRows ?? []) yearById.set(s.id, s.year);
  const yearOf = (id: string) => yearById.get(id) ?? 0;
  return {
    standings: (standingsRaw ?? []).map((r) => ({ ...r, season_year: yearOf(r.season_id) })),
    continental: (continentalRaw ?? []).map((r) => ({ ...r, season_year: yearOf(r.season_id) })),
    international: (internationalRaw ?? []).map((r) => ({ ...r, season_year: yearOf(r.season_id) })),
    coaches: (coachesRaw ?? []).map((r) => ({ ...r, season_year: yearOf(r.season_id) })),
    transfers: transfersRaw ?? [],
  };
}

/** Extract members of the competition from the loaded universe. */
function resolveMembers(
  competition: string,
  all: Awaited<ReturnType<typeof fetchAllMembership>>,
): { members: Array<{ club_name: string; season_year: number }>; seasons: number[] } {
  const list: Array<{ club_name: string; season_year: number }> = [];
  const seasonsSet = new Set<number>();

  const compKey = normKey(competition);
  // Nationals & Super League via standings
  for (const s of all.standings) {
    if (!s.club_name || !s.season_year) continue;
    const compKeys = [normKey(s.competition), normKey(s.division_label)];
    if (
      s.module === "superleague" &&
      s.division_num != null &&
      normKey(`Div. ${s.division_num}`) === compKey
    ) {
      list.push({ club_name: s.club_name, season_year: s.season_year });
      seasonsSet.add(s.season_year);
    } else if (compKeys.includes(compKey)) {
      list.push({ club_name: s.club_name, season_year: s.season_year });
      seasonsSet.add(s.season_year);
    }
  }
  // Continental participants via continental_results team fields
  for (const r of all.continental) {
    if (normKey(r.competition) !== compKey) continue;
    const teams = [r.team1, r.team2, r.sf1, r.sf2, r.qf1, r.qf2, r.qf3, r.qf4];
    for (const t of teams) {
      if (t) {
        list.push({ club_name: t, season_year: r.season_year });
        seasonsSet.add(r.season_year);
      }
    }
  }
  // International (national teams) via international_results
  for (const r of all.international) {
    if (normKey(r.competition) !== compKey) continue;
    if (r.team1) list.push({ club_name: r.team1, season_year: r.season_year });
    if (r.team2) list.push({ club_name: r.team2, season_year: r.season_year });
    seasonsSet.add(r.season_year);
  }
  return {
    members: list,
    seasons: [...seasonsSet].sort((a, b) => a - b),
  };
}

function buildClubCatalog(all: Awaited<ReturnType<typeof fetchAllMembership>>) {
  const map = new Map<
    string,
    { country: string | null; competition: string | null; division_num: number | null; module: string | null }
  >();
  // Prefer standings for competition + division
  for (const s of all.standings) {
    if (!s.club_name || !s.season_year) continue;
    const key = seasonClubKey(s.club_name, s.season_year);
    const prev = map.get(key);
    map.set(key, {
      country: prev?.country ?? null,
      competition:
        prev?.competition ??
        s.competition ??
        s.division_label ??
        (s.module === "superleague" && s.division_num != null ? `Div. ${s.division_num}` : null),
      division_num: prev?.division_num ?? s.division_num,
      module: prev?.module ?? s.module,
    });
  }
  // Country via coach_assignments
  for (const c of all.coaches) {
    if (!c.club_name || !c.season_year) continue;
    const key = seasonClubKey(c.club_name, c.season_year);
    const prev = map.get(key) ?? { country: null, competition: null, division_num: null, module: c.module };
    if (!prev.country && c.country_name) prev.country = c.country_name;
    map.set(key, prev);
  }
  return map;
}

async function fetchPlayerSnapshots(
  transfers: RawTransfer[],
): Promise<Map<string, PlayerSnapshot>> {
  const names = new Set<string>();
  for (const t of transfers) {
    if (t.person_name) names.add(t.person_name);
  }
  const nameList = [...names];
  if (nameList.length === 0) return new Map();

  const map = new Map<string, PlayerSnapshot>();
  const CHUNK = 200;
  for (let i = 0; i < nameList.length; i += CHUNK) {
    const chunk = nameList.slice(i, i + CHUNK);
    const { data } = (await supabase
      .from("player_profiles")
      .select(
        "player_name, season_year, nationality, continent, age, ca, vp, salary, reputation, primary_position, personality, preferred_foot, height",
      )
      .in("player_name", chunk)) as unknown as {
      data: Array<{
        player_name: string;
        season_year: number;
        nationality: string | null;
        continent: string | null;
        age: number | null;
        ca: number | null;
        vp: number | null;
        salary: number | null;
        reputation: number | null;
        primary_position: string | null;
        personality: string | null;
        preferred_foot: string | null;
        height: number | null;
      }> | null;
    };
    for (const p of data ?? []) {
      map.set(playerKey(p.player_name, p.season_year), {
        nationality: p.nationality,
        continent: p.continent,
        age: p.age,
        ca: p.ca,
        vp: p.vp == null ? null : Number(p.vp),
        salary: p.salary == null ? null : Number(p.salary),
        reputation: p.reputation,
        primary_position: p.primary_position,
        personality: p.personality,
        preferred_foot: p.preferred_foot,
        height: p.height == null ? null : Number(p.height),
      });
    }
  }
  return map;
}

export async function fetchCompetitionMarket(competition: string): Promise<CompetitionMarketData> {
  const all = await fetchAllMembership();
  const { members, seasons } = resolveMembers(competition, all);
  const memberKeys = new Set<string>();
  const memberClubsAllTime = new Set<string>();
  for (const m of members) {
    memberKeys.add(seasonClubKey(m.club_name, m.season_year));
    memberClubsAllTime.add(normKey(m.club_name));
  }
  // Filter transfers where either side is a member in that season
  const transfers = all.transfers.filter((t) => {
    if (!t.season_year) return false;
    const toKey = seasonClubKey(t.to_club_name, t.season_year);
    const fromKey = seasonClubKey(t.from_club_name, t.season_year);
    return memberKeys.has(toKey) || memberKeys.has(fromKey);
  });
  const clubCatalog = buildClubCatalog(all);
  const playerIndex = await fetchPlayerSnapshots(transfers);
  return {
    competition,
    members,
    memberKeys,
    memberClubsAllTime,
    transfers,
    clubCatalog,
    playerIndex,
    seasons,
  };
}

export function useCompetitionMarket(competition: string | undefined) {
  return useQuery({
    queryKey: ["competition-market", competition],
    queryFn: () => fetchCompetitionMarket(competition!),
    staleTime: 10 * 60 * 1000,
    enabled: !!competition,
  });
}
