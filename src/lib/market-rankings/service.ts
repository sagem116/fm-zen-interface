// Market Rankings — data service.
// Fetches transfers + supporting indexes in one batch and exposes normalized
// per-transfer records enriched with buyer/seller context (competition,
// country, continent, coach) and player age at the transfer season.
//
// Read-only. Never mutates business rules of other modules.

import { supabase } from "@/integrations/supabase/client";

const normKey = (s: string | null | undefined): string =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export interface MarketTransfer {
  id: string;
  season_year: number;
  person_name: string;
  person_type: string;
  from_club: string | null;
  from_club_key: string | null;
  to_club: string | null;
  to_club_key: string | null;
  value: number;
  age: number | null;

  buyerCompetition: string | null;
  buyerCountry: string | null;
  buyerContinent: string | null;
  buyerCoach: string | null;

  sellerCompetition: string | null;
  sellerCountry: string | null;
  sellerContinent: string | null;
  sellerCoach: string | null;
}

export interface MarketDataset {
  transfers: MarketTransfer[];
  seasons: number[];
  countries: string[];
  continents: string[];
  competitions: string[];
  clubDisplayName: Map<string, string>;
  coachDisplayName: Map<string, string>;
  competitionDisplayName: Map<string, string>;
  clubToCompetition: Map<string, string>; // "clubKey::year" → competition
  clubCountry: Map<string, string>; // clubKey → country name
  clubContinent: Map<string, string>; // clubKey → continent
  coachByClubSeason: Map<string, string>; // "clubKey::year" → coach name
}

const seasonClubKey = (club: string | null | undefined, year: number | null | undefined) =>
  `${normKey(club)}::${year ?? 0}`;

export async function fetchMarketDataset(): Promise<MarketDataset> {
  const [
    { data: seasonsRows },
    { data: transfersRaw },
    { data: standingsRaw },
    { data: clubsRaw },
    { data: countriesRaw },
    { data: coachAssignRaw },
    { data: profilesRaw },
  ] = (await Promise.all([
    supabase.from("seasons").select("id, year"),
    supabase
      .from("transfers")
      .select(
        "id, season_year, person_name, person_type, from_club_name, from_club_name_key, to_club_name, to_club_name_key, value",
      ),
    supabase
      .from("standings")
      .select("season_id, competition, division_label, division_num, module, club_name"),
    supabase.from("clubs").select("name, country_id, continent"),
    supabase.from("countries").select("id, name"),
    supabase
      .from("coach_assignments")
      .select("season_id, coach_name, club_name, club_role"),
    supabase.from("player_profiles").select("player_name, season_year, age"),
  ])) as unknown as [
    { data: Array<{ id: string; year: number }> | null },
    {
      data: Array<{
        id: string;
        season_year: number;
        person_name: string;
        person_type: string;
        from_club_name: string | null;
        from_club_name_key: string | null;
        to_club_name: string | null;
        to_club_name_key: string | null;
        value: number | null;
      }> | null;
    },
    {
      data: Array<{
        season_id: string;
        competition: string | null;
        division_label: string | null;
        division_num: number | null;
        module: string;
        club_name: string | null;
      }> | null;
    },
    { data: Array<{ name: string; country_id: string | null; continent: string | null }> | null },
    { data: Array<{ id: string; name: string }> | null },
    {
      data: Array<{
        season_id: string;
        coach_name: string;
        club_name: string | null;
        club_role: string | null;
      }> | null;
    },
    {
      data: Array<{ player_name: string; season_year: number; age: number | null }> | null;
    },
  ];

  const yearById = new Map<string, number>();
  for (const s of seasonsRows ?? []) yearById.set(s.id, s.year);

  const countryById = new Map<string, string>();
  for (const c of countriesRaw ?? []) countryById.set(c.id, c.name);

  const clubDisplayName = new Map<string, string>();
  const clubCountry = new Map<string, string>();
  const clubContinent = new Map<string, string>();
  for (const c of clubsRaw ?? []) {
    if (!c.name) continue;
    const key = normKey(c.name);
    if (!clubDisplayName.has(key)) clubDisplayName.set(key, c.name);
    if (c.country_id && countryById.has(c.country_id)) {
      clubCountry.set(key, countryById.get(c.country_id)!);
    }
    if (c.continent) clubContinent.set(key, c.continent);
  }

  // Competition per (club, year) via standings
  const clubToCompetition = new Map<string, string>();
  const competitionDisplayName = new Map<string, string>();
  for (const s of standingsRaw ?? []) {
    const year = yearById.get(s.season_id);
    if (!year || !s.club_name) continue;
    const comp =
      s.competition ??
      s.division_label ??
      (s.module === "superleague" && s.division_num != null ? `Div. ${s.division_num}` : null);
    if (!comp) continue;
    const key = seasonClubKey(s.club_name, year);
    if (!clubToCompetition.has(key)) clubToCompetition.set(key, comp);
    const compKey = normKey(comp);
    if (!competitionDisplayName.has(compKey)) competitionDisplayName.set(compKey, comp);
    // Ensure club display name has an entry
    const ck = normKey(s.club_name);
    if (!clubDisplayName.has(ck)) clubDisplayName.set(ck, s.club_name);
  }

  // Coach per (club, year) — prefer head coach role
  const coachByClubSeason = new Map<string, string>();
  const coachDisplayName = new Map<string, string>();
  for (const c of coachAssignRaw ?? []) {
    const year = yearById.get(c.season_id);
    if (!year || !c.club_name || !c.coach_name) continue;
    const key = seasonClubKey(c.club_name, year);
    const role = (c.club_role ?? "").toLowerCase();
    const isHead =
      role.includes("treinador principal") ||
      role.includes("head coach") ||
      role.includes("principal") ||
      role === "";
    if (!coachByClubSeason.has(key) || isHead) {
      coachByClubSeason.set(key, c.coach_name);
    }
    const ck = normKey(c.coach_name);
    if (!coachDisplayName.has(ck)) coachDisplayName.set(ck, c.coach_name);
  }

  // Age by (player, season)
  const ageIndex = new Map<string, number>();
  for (const p of profilesRaw ?? []) {
    if (!p.player_name || !p.season_year) continue;
    if (p.age == null) continue;
    ageIndex.set(`${normKey(p.player_name)}::${p.season_year}`, p.age);
  }

  const seasonsSet = new Set<number>();
  const transfers: MarketTransfer[] = [];
  for (const t of transfersRaw ?? []) {
    if (!t.season_year) continue;
    seasonsSet.add(t.season_year);
    const fromKey = t.from_club_name_key ?? normKey(t.from_club_name);
    const toKey = t.to_club_name_key ?? normKey(t.to_club_name);
    const buyerCompKey = toKey ? seasonClubKey(t.to_club_name, t.season_year) : null;
    const sellerCompKey = fromKey ? seasonClubKey(t.from_club_name, t.season_year) : null;

    transfers.push({
      id: t.id,
      season_year: t.season_year,
      person_name: t.person_name,
      person_type: t.person_type,
      from_club: t.from_club_name,
      from_club_key: fromKey || null,
      to_club: t.to_club_name,
      to_club_key: toKey || null,
      value: Number(t.value ?? 0),
      age: ageIndex.get(`${normKey(t.person_name)}::${t.season_year}`) ?? null,

      buyerCompetition: buyerCompKey ? clubToCompetition.get(buyerCompKey) ?? null : null,
      buyerCountry: toKey ? clubCountry.get(toKey) ?? null : null,
      buyerContinent: toKey ? clubContinent.get(toKey) ?? null : null,
      buyerCoach: buyerCompKey ? coachByClubSeason.get(buyerCompKey) ?? null : null,

      sellerCompetition: sellerCompKey ? clubToCompetition.get(sellerCompKey) ?? null : null,
      sellerCountry: fromKey ? clubCountry.get(fromKey) ?? null : null,
      sellerContinent: fromKey ? clubContinent.get(fromKey) ?? null : null,
      sellerCoach: sellerCompKey ? coachByClubSeason.get(sellerCompKey) ?? null : null,
    });

    if (t.to_club_name) {
      const k = normKey(t.to_club_name);
      if (!clubDisplayName.has(k)) clubDisplayName.set(k, t.to_club_name);
    }
    if (t.from_club_name) {
      const k = normKey(t.from_club_name);
      if (!clubDisplayName.has(k)) clubDisplayName.set(k, t.from_club_name);
    }
  }

  const countries = [...new Set([...clubCountry.values()])].sort();
  const continents = [...new Set([...clubContinent.values()])].sort();
  const competitions = [...new Set([...competitionDisplayName.values()])].sort();

  return {
    transfers,
    seasons: [...seasonsSet].sort((a, b) => a - b),
    countries,
    continents,
    competitions,
    clubDisplayName,
    coachDisplayName,
    competitionDisplayName,
    clubToCompetition,
    clubCountry,
    clubContinent,
    coachByClubSeason,
  };
}

export { normKey, seasonClubKey };
