import { supabase } from "@/integrations/supabase/client";
import type { ParseResult } from "./fm-parser";
import type { StandingRow, ContinentalRow, CoachRow, InternationalRow } from "./fm-rankings";
import { normalizeCountry } from "./fm-continents";

// Supabase PostgREST caps each request (default 1000 rows). Paginate with .range()
// and advance by the actual returned length so we work regardless of the server cap.
async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  columns: string,
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  let from = 0;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length === 0 || rows.length < pageSize) break;
    from += rows.length;
  }
  return out;
}

async function chunkInsert(table: string, rows: Record<string, unknown>[]) {
  const size = 500;
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(table).insert(slice);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export interface ImportSummary {
  seasonYear: number;
  module: string;
  standings: number;
  coaches: number;
  continental: number;
}

export async function importSeason(
  parse: ParseResult,
  year: number,
  filename: string,
): Promise<ImportSummary> {
  const module = parse.kind; // 'superleague' | 'national'

  // 1. Ensure season (never overwrite other seasons)
  let { data: season } = await supabase.from("seasons").select("id").eq("year", year).maybeSingle();
  if (!season) {
    const ins = await supabase
      .from("seasons")
      .insert({ year, label: String(year) })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    season = ins.data;
  }
  const seasonId = season!.id;

  // 2. Re-import of same module+season: clear that slice only
  await supabase.from("standings").delete().eq("season_id", seasonId).eq("module", module);
  await supabase.from("coach_assignments").delete().eq("season_id", seasonId).eq("module", module);
  if (module === "national") {
    await supabase.from("continental_results").delete().eq("season_id", seasonId);
    await supabase.from("international_results").delete().eq("season_id", seasonId);
  }
  await supabase.from("players").delete().eq("season_id", seasonId).eq("module", module);

  // 3. Upsert countries
  const countryNames = [
    ...new Set(parse.data.teamCountry.map((t) => t.country).filter(Boolean) as string[]),
  ];
  if (countryNames.length) {
    await supabase.from("countries").upsert(
      countryNames.map((name) => ({ name })),
      { onConflict: "name" },
    );
  }
  const { data: countryRows } = await supabase.from("countries").select("id,name");
  const countryMap = new Map((countryRows ?? []).map((c) => [c.name, c.id]));

  // 4. Upsert clubs (from teamCountry + standings + continental)
  const clubNames = new Set<string>();
  parse.data.teamCountry.forEach((t) => clubNames.add(t.club));
  parse.data.standings.forEach((s) => clubNames.add(s.club_name));
  parse.data.continental.forEach((c) => {
    if (c.team1) clubNames.add(c.team1);
    if (c.team2) clubNames.add(c.team2);
    [c.sf1, c.sf2, c.qf1, c.qf2, c.qf3, c.qf4].forEach((n) => {
      if (n) clubNames.add(n);
    });
  });
  parse.data.players.forEach((p) => {
    if (p.club_name) clubNames.add(p.club_name);
  });
  const clubCountryLookup = new Map(parse.data.teamCountry.map((t) => [t.club, t.country]));
  const clubPayload = [...clubNames].map((name) => {
    const country = clubCountryLookup.get(name);
    const cid = country ? countryMap.get(country) : undefined;
    return cid ? { name, country_id: cid } : { name };
  });
  if (clubPayload.length) {
    await supabase
      .from("clubs")
      .upsert(clubPayload, { onConflict: "name", ignoreDuplicates: false });
  }
  const { data: clubRows } = await supabase.from("clubs").select("id,name");
  const clubMap = new Map((clubRows ?? []).map((c) => [c.name, c.id]));

  // 5. Standings
  const standingsPayload = parse.data.standings.map((s) => ({
    season_id: seasonId,
    module,
    division_label: s.division_label,
    division_num: s.division_num,
    position: s.position,
    info: s.info,
    club_id: clubMap.get(s.club_name) ?? null,
    club_name: s.club_name,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    gf: s.gf,
    ga: s.ga,
    gd: s.gd,
    points: s.points,
    is_champion: s.is_champion,
  }));
  await chunkInsert("standings", standingsPayload);

  // 6. Continental
  if (module === "national" && parse.data.continental.length) {
    const contPayload = parse.data.continental.map((c) => ({
      season_id: seasonId,
      competition: c.competition,
      team1: c.team1,
      team2: c.team2,
      result: c.result,
      club1_id: c.team1 ? (clubMap.get(c.team1) ?? null) : null,
      club2_id: c.team2 ? (clubMap.get(c.team2) ?? null) : null,
      winner_club_id: c.winner ? (clubMap.get(c.winner) ?? null) : null,
      sf1: c.sf1,
      sf2: c.sf2,
      qf1: c.qf1,
      qf2: c.qf2,
      qf3: c.qf3,
      qf4: c.qf4,
    }));
    await chunkInsert("continental_results", contPayload);
  }

  // 6b. International (national-team competitions)
  if (module === "national" && parse.data.international.length) {
    const intPayload = parse.data.international.map((c) => ({
      season_id: seasonId,
      competition: c.competition,
      team1: c.team1,
      team2: c.team2,
      coach1: c.coach1,
      coach2: c.coach2,
      result: c.result,
      winner: c.winner,
      sf1: c.sf1,
      sf1_coach: c.sf1_coach,
      sf2: c.sf2,
      sf2_coach: c.sf2_coach,
      qf1: c.qf1,
      qf1_coach: c.qf1_coach,
      qf2: c.qf2,
      qf2_coach: c.qf2_coach,
      qf3: c.qf3,
      qf3_coach: c.qf3_coach,
      qf4: c.qf4,
      qf4_coach: c.qf4_coach,
    }));
    await chunkInsert("international_results", intPayload);
  }

  // 7. Coaches + assignments
  const uniqueCoaches = new Map<string, { name: string; nationality: string | null }>();
  parse.data.coaches.forEach((c) => {
    uniqueCoaches.set(`${c.name}|${c.nationality ?? ""}`, {
      name: c.name,
      nationality: c.nationality,
    });
  });
  if (uniqueCoaches.size) {
    await supabase
      .from("coaches")
      .upsert([...uniqueCoaches.values()], { onConflict: "name,nationality" });
  }
  const { data: coachRows } = await supabase.from("coaches").select("id,name,nationality");
  const coachMap = new Map(
    (coachRows ?? []).map((c) => [`${c.name}|${c.nationality ?? ""}`, c.id]),
  );
  const assignPayload = parse.data.coaches
    .map((c) => {
      const coachId = coachMap.get(`${c.name}|${c.nationality ?? ""}`);
      if (!coachId) return null;
      return {
        season_id: seasonId,
        module,
        coach_id: coachId,
        coach_name: c.name,
        club_id: c.club_name ? (clubMap.get(c.club_name) ?? null) : null,
        club_name: c.club_name,
        info: c.info,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];
  if (assignPayload.length) await chunkInsert("coach_assignments", assignPayload);

  // 7b. Players (snapshot — superleague & national)
  if (parse.data.players.length) {
    const playersPayload = parse.data.players.map((p) => ({
      season_id: seasonId,
      module,
      idu: p.idu,
      name: p.name,
      league: p.league,
      club_name: p.club_name,
      club_id: p.club_name ? (clubMap.get(p.club_name) ?? null) : null,
      age: p.age,
      gls: p.gls,
      ast: p.ast,
      salary: p.salary,
      ra: p.ra,
      rm: p.rm,
      ca: p.ca,
      cp: p.cp,
      vp: p.vp,
      info: p.info,
      rec: p.rec,
    }));
    await chunkInsert("players", playersPayload);
  }

  // 8. Import log
  await supabase.from("imports").insert({
    season_id: seasonId,
    module,
    filename,
    status: parse.blocked ? "blocked" : "ok",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warnings: parse.messages as any,
  });

  return {
    seasonYear: year,
    module,
    standings: standingsPayload.length,
    coaches: assignPayload.length,
    continental: module === "national" ? parse.data.continental.length : 0,
  };
}

export interface ImportLogRow {
  id: string;
  filename: string | null;
  module:
    | "superleague"
    | "national"
    | "player_stats"
    | "player_profiles"
    | "clubs"
    | "coaches"
    | "players"
    | "competitions"
    | "classifications"
    | "statistics"
    | "transfers";
  status: string;
  created_at: string;
  season_id: string;
  season_year: number;
  warnings: unknown;
}

export async function fetchImports(): Promise<ImportLogRow[]> {
  const [{ data: imports }, { data: seasons }] = await Promise.all([
    supabase
      .from("imports")
      .select("id,filename,module,status,created_at,season_id,warnings")
      .order("created_at", { ascending: false }),
    supabase.from("seasons").select("id,year"),
  ]);
  const yearMap = new Map((seasons ?? []).map((s) => [s.id, s.year]));
  return (imports ?? []).map((i) => ({
    id: i.id,
    filename: i.filename,
    module: i.module as ImportLogRow["module"],
    status: i.status,
    created_at: i.created_at,
    season_id: i.season_id,
    season_year: yearMap.get(i.season_id) ?? 0,
    warnings: i.warnings,
  }));
}

export async function updateImportReport(id: string, patch: { report?: unknown } = {}): Promise<void> {
  // Fetch existing row
  const { data, error } = await supabase.from("imports").select("id,warnings").eq("id", id).maybeSingle();
  if (error) throw new Error(`imports.fetch: ${error.message}`);
  if (!data) throw new Error(`imports: row not found ${id}`);
  const existingWarnings = (data as any).warnings ?? {};
  const merged = { ...existingWarnings };
  if (patch.report !== undefined) merged.report = patch.report;

  const { error: er2 } = await supabase.from("imports").update({ warnings: merged }).eq("id", id);
  if (er2) throw new Error(`imports.update: ${er2.message}`);
}

export async function deleteImport(row: ImportLogRow): Promise<void> {
  // Remove the data slice for this season+module, then the import log entry.
  if (row.module === "player_stats" || row.module === "statistics") {
    await supabase.from("player_stats").delete().eq("season_year", row.season_year);
    await supabase.from("competition_stats").delete().eq("season_year", row.season_year);
    await supabase.from("players").delete().eq("season_id", row.season_id);
  } else if (row.module === "player_profiles" || row.module === "players") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("player_profiles").delete().eq("season_id", row.season_id);
  } else if (row.module === "clubs") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("club_reputation_season").delete().eq("season_id", row.season_id);
  } else if (row.module === "coaches") {
    await supabase.from("coach_assignments").delete().eq("season_id", row.season_id);
  } else if (row.module === "competitions") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("competition_reputation")
      .delete()
      .eq("season_year", row.season_year);
  } else if (row.module === "transfers") {
    await supabase.from("transfers").delete().eq("season_id", row.season_id);
  } else if (row.module === "classifications") {
    await supabase
      .from("standings")
      .delete()
      .eq("season_id", row.season_id)
      .in("module", ["superleague", "national"]);
    await supabase.from("continental_results").delete().eq("season_id", row.season_id);
    await supabase.from("international_results").delete().eq("season_id", row.season_id);
  } else if ((row.module as string) === "competitions_all") {
    // New two-file model: Competições file populates standings + coach_assignments +
    // continental + international + club_reputation_season + competition_reputation.
    await supabase
      .from("standings")
      .delete()
      .eq("season_id", row.season_id)
      .in("module", ["superleague", "national"]);
    await supabase.from("coach_assignments").delete().eq("season_id", row.season_id);
    await supabase.from("continental_results").delete().eq("season_id", row.season_id);
    await supabase.from("international_results").delete().eq("season_id", row.season_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("club_reputation_season").delete().eq("season_id", row.season_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("competition_reputation")
      .delete()
      .eq("season_year", row.season_year);
  } else {
    await supabase
      .from("standings")
      .delete()
      .eq("season_id", row.season_id)
      .eq("module", row.module);
    await supabase
      .from("coach_assignments")
      .delete()
      .eq("season_id", row.season_id)
      .eq("module", row.module);
    if (row.module === "national") {
      await supabase.from("continental_results").delete().eq("season_id", row.season_id);
      await supabase.from("international_results").delete().eq("season_id", row.season_id);
    }
    if (row.module === "superleague") {
      await supabase.from("players").delete().eq("season_id", row.season_id);
    }
  }
  await supabase.from("imports").delete().eq("id", row.id);
}

export interface AllData {
  seasons: { id: string; year: number }[];
  standings: StandingRow[];
  continental: ContinentalRow[];
  international: InternationalRow[];
  coaches: CoachRow[];
  clubCountry: Record<string, string | null>;
  rawClubCountry: Record<string, string | null>;
  players: PlayerRow[];
}

export interface PlayerRow {
  season_year: number;
  module: "superleague" | "national";
  idu: string | null;
  name: string;
  league: string | null;
  club_name: string | null;
  age: number | null;
  gls: number;
  ast: number;
  salary: number;
  ra: number;
  rm: number;
  ca: number;
  cp: number;
  vp: number;
}

export async function fetchAllData(): Promise<AllData> {
  const [seasonsAll, clubsAll, countriesAll] = await Promise.all([
    fetchAllRows<{ id: string; year: number }>("seasons", "id,year"),
    fetchAllRows<{ name: string; country_id: string | null }>("clubs", "name,country_id"),
    fetchAllRows<{ id: string; name: string }>("countries", "id,name"),
  ]);
  const seasonMap = new Map(seasonsAll.map((s) => [s.id, s.year]));
  const countryById = new Map(countriesAll.map((c) => [c.id, c.name]));
  const clubCountry: Record<string, string | null> = {};
  clubsAll.forEach((c) => {
    clubCountry[c.name] = c.country_id
      ? normalizeCountry(countryById.get(c.country_id) ?? null)
      : null;
  });
  const rawClubCountry: Record<string, string | null> = { ...clubCountry };
  // Defer national-league country inference until after standings are loaded below.

  const [standings, continental, internationalRaw, coachAssign, playersRaw, clubIds, coachNat] =
    await Promise.all([
      fetchAllRows<Record<string, unknown>>(
        "standings",
        "season_id,module,division_num,division_label,competition,position,club_name,is_champion,info,points,played,wins,draws,losses,gf,ga",
      ),

      fetchAllRows<Record<string, unknown>>(
        "continental_results",
        "season_id,competition,team1,team2,winner_club_id,sf1,sf2,qf1,qf2,qf3,qf4",
      ),
      fetchAllRows<Record<string, unknown>>(
        "international_results",
        "season_id,competition,team1,team2,coach1,coach2,winner,sf1,sf1_coach,sf2,sf2_coach,qf1,qf1_coach,qf2,qf2_coach,qf3,qf3_coach,qf4,qf4_coach",
      ),
      fetchAllRows<Record<string, unknown>>(
        "coach_assignments",
        "season_id,module,coach_name,club_name,club_role,intl_role,country_name",
      ),
      fetchAllRows<Record<string, unknown>>(
        "players",
        "season_id,module,idu,name,league,club_name,age,gls,ast,salary,ra,rm,ca,cp,vp",
      ),
      fetchAllRows<{ id: string; name: string }>("clubs", "id,name"),
      fetchAllRows<{ name: string; nationality: string | null }>("coaches", "name,nationality"),
    ]);

  const clubIdName = new Map<string, string>();
  clubIds.forEach((c) => clubIdName.set(c.id, c.name));

  const coachNatMap = new Map<string, string | null>();
  coachNat.forEach((c) => {
    if (c.nationality) coachNatMap.set(c.name, normalizeCountry(c.nationality));
  });

  const standingRows: StandingRow[] = standings.map((row) => {
    const s = row as Record<string, unknown> as {
      season_id: string;
      module: StandingRow["module"];
      division_num: number;
      division_label?: string | null;
      competition?: string | null;
      position: number;
      club_name: string;
      is_champion: boolean;
      info: string | null;
      points?: number | null;
      played?: number | null;
      wins?: number | null;
      draws?: number | null;
      losses?: number | null;
      gf?: number | null;
      ga?: number | null;
    };
    return {
      season_year: seasonMap.get(s.season_id) ?? 0,
      module: s.module,
      division_num: s.division_num,
      division_label: s.division_label ?? null,
      competition: s.competition ?? null,
      position: s.position,
      club_name: s.club_name,
      is_champion: s.is_champion,
      info: s.info,
      points: s.points ?? null,
      played: s.played ?? null,
      wins: s.wins ?? null,
      draws: s.draws ?? null,
      losses: s.losses ?? null,
      gf: s.gf ?? null,
      ga: s.ga ?? null,
    };
  });

  const continentalRows: ContinentalRow[] = continental.map((row) => {
    const c = row as {
      season_id: string;
      competition: string;
      team1: string | null;
      team2: string | null;
      winner_club_id: string | null;
      sf1: string | null;
      sf2: string | null;
      qf1: string | null;
      qf2: string | null;
      qf3: string | null;
      qf4: string | null;
    };
    return {
      season_year: seasonMap.get(c.season_id) ?? 0,
      competition: c.competition,
      team1: c.team1,
      team2: c.team2,
      winner: c.winner_club_id ? (clubIdName.get(c.winner_club_id) ?? null) : null,
      sf1: c.sf1,
      sf2: c.sf2,
      qf1: c.qf1,
      qf2: c.qf2,
      qf3: c.qf3,
      qf4: c.qf4,
    };
  });
  const internationalRows: InternationalRow[] = internationalRaw.map((row) => {
    const c = row as {
      season_id: string;
      competition: string;
      team1: string | null;
      team2: string | null;
      coach1: string | null;
      coach2: string | null;
      winner: string | null;
      sf1: string | null;
      sf1_coach: string | null;
      sf2: string | null;
      sf2_coach: string | null;
      qf1: string | null;
      qf1_coach: string | null;
      qf2: string | null;
      qf2_coach: string | null;
      qf3: string | null;
      qf3_coach: string | null;
      qf4: string | null;
      qf4_coach: string | null;
    };
    return {
      season_year: seasonMap.get(c.season_id) ?? 0,
      competition: c.competition,
      team1: normalizeCountry(c.team1),
      team2: normalizeCountry(c.team2),
      coach1: c.coach1,
      coach2: c.coach2,
      winner: normalizeCountry(c.winner),
      sf1: normalizeCountry(c.sf1),
      sf1_coach: c.sf1_coach,
      sf2: normalizeCountry(c.sf2),
      sf2_coach: c.sf2_coach,
      qf1: normalizeCountry(c.qf1),
      qf1_coach: c.qf1_coach,
      qf2: normalizeCountry(c.qf2),
      qf2_coach: c.qf2_coach,
      qf3: normalizeCountry(c.qf3),
      qf3_coach: c.qf3_coach,
      qf4: normalizeCountry(c.qf4),
      qf4_coach: c.qf4_coach,
    };
  });
  const coachRows: CoachRow[] = coachAssign.map((row) => {
    const c = row as {
      season_id: string;
      module: CoachRow["module"];
      coach_name: string;
      club_name: string | null;
      club_role?: string | null;
      intl_role?: string | null;
      country_name?: string | null;
    };
    return {
      season_year: seasonMap.get(c.season_id) ?? 0,
      module: c.module,
      name: c.coach_name,
      nationality: coachNatMap.get(c.coach_name) ?? null,
      club_name: c.club_name,
      club_role: c.club_role ?? null,
      intl_role: c.intl_role ?? null,
      country_name: c.country_name ?? null,
    };
  });
  const playerRows: PlayerRow[] = playersRaw.map((row) => {
    const p = row as Record<string, unknown> as {
      season_id: string;
      module: PlayerRow["module"];
      idu: string | null;
      name: string;
      league: string | null;
      club_name: string | null;
      age: number | null;
      gls: number;
      ast: number;
      salary: number;
      ra: number;
      rm: number;
      ca: number;
      cp: number;
      vp: number;
    };
    return {
      season_year: seasonMap.get(p.season_id) ?? 0,
      module: p.module,
      idu: p.idu,
      name: p.name,
      league: p.league,
      club_name: p.club_name,
      age: p.age,
      gls: Number(p.gls) || 0,
      ast: Number(p.ast) || 0,
      salary: Number(p.salary) || 0,
      ra: Number(p.ra) || 0,
      rm: Number(p.rm) || 0,
      ca: Number(p.ca) || 0,
      cp: Number(p.cp) || 0,
      vp: Number(p.vp) || 0,
    };
  });

  // Infer country for clubs in national leagues based on the dominant country
  // of clubs already mapped within the same division_label. This makes national
  // league results contribute to country rankings even when the imported file
  // did not include explicit country mappings for those clubs.
  const leagueCountryCount = new Map<string, Map<string, number>>();
  for (const s of standingRows) {
    if (s.module !== "national" || !s.division_label) continue;
    const country = clubCountry[s.club_name];
    if (!country) continue;
    let inner = leagueCountryCount.get(s.division_label);
    if (!inner) {
      inner = new Map();
      leagueCountryCount.set(s.division_label, inner);
    }
    inner.set(country, (inner.get(country) ?? 0) + 1);
  }
  const leagueCountry = new Map<string, string>();
  for (const [label, counts] of leagueCountryCount) {
    let best: string | null = null;
    let bestN = 0;
    for (const [c, n] of counts)
      if (n > bestN) {
        best = c;
        bestN = n;
      }
    if (best) leagueCountry.set(label, best);
  }
  for (const s of standingRows) {
    if (s.module !== "national" || !s.division_label) continue;
    if (clubCountry[s.club_name]) continue;
    const inferred = leagueCountry.get(s.division_label);
    if (inferred) clubCountry[s.club_name] = inferred;
  }

  return {
    seasons: seasonsAll.map((s) => ({ id: s.id, year: s.year })),
    standings: standingRows,
    continental: continentalRows,
    international: internationalRows,
    coaches: coachRows,
    clubCountry,
    rawClubCountry,
    players: playerRows,
  };
}

export async function logImportFailure(
  seasonYear: number,
  module: ImportLogRow["module"] | string,
  filename: string,
  message: string,
): Promise<void> {
  let { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", seasonYear)
    .maybeSingle();
  if (!season) {
    const ins = await supabase
      .from("seasons")
      .insert({ year: seasonYear, label: String(seasonYear) })
      .select("id")
      .single();
    if (ins.error) return;
    season = ins.data;
  }

  await supabase.from("imports").insert({
    season_id: season.id,
    module,
    filename,
    status: "error",
    warnings: { messages: [message] },
  });
}

export interface CareerCoachCandidate {
  idu: string;
  name: string;
  club: string | null;
  country: string | null;
  role: string | null;
  seasonYear: number;
  lastUpdated: string | null;
}

export async function fetchCareerCoachCandidates(): Promise<CareerCoachCandidate[]> {
  const [{ data: seasons }, { data: assignments }, { data: coaches }, { data: imports }] =
    await Promise.all([
      supabase.from("seasons").select("id,year"),
      supabase
        .from("coach_assignments")
        .select("season_id,coach_name,club_name,country_name,club_role,intl_role"),
      supabase.from("coaches").select("name,idu,nationality"),
      supabase
        .from("imports")
        .select("season_id,module,created_at")
        .in("module", ["coaches", "competitions", "classifications", "national", "superleague"]),
    ]);

  const seasonById = new Map((seasons ?? []).map((s) => [s.id, s.year]));
  const importUpdatedBySeason = new Map<string, string>();
  for (const row of imports ?? []) {
    const prev = importUpdatedBySeason.get(row.season_id);
    if (!prev || new Date(row.created_at).getTime() > new Date(prev).getTime()) {
      importUpdatedBySeason.set(row.season_id, row.created_at);
    }
  }

  const iduByCoachName = new Map<string, string>();
  const nationalityByCoachName = new Map<string, string>();
  for (const coach of coaches ?? []) {
    const idu = String(coach.idu ?? "").trim();
    if (!idu) continue;
    if (!iduByCoachName.has(coach.name)) {
      iduByCoachName.set(coach.name, idu);
    }
    const nationality = String(coach.nationality ?? "").trim();
    if (nationality && !nationalityByCoachName.has(coach.name)) {
      nationalityByCoachName.set(coach.name, nationality);
    }
  }

  const latestByIdu = new Map<string, CareerCoachCandidate>();
  for (const row of assignments ?? []) {
    const idu = iduByCoachName.get(row.coach_name);
    if (!idu) continue;
    const seasonYear = seasonById.get(row.season_id) ?? 0;
    const role = row.club_role ?? row.intl_role ?? (row.country_name ? "Selecionador" : null);
    const candidate: CareerCoachCandidate = {
      idu,
      name: row.coach_name,
      club: row.club_name,
      country: row.country_name ?? nationalityByCoachName.get(row.coach_name) ?? null,
      role,
      seasonYear,
      lastUpdated: importUpdatedBySeason.get(row.season_id) ?? null,
    };

    const current = latestByIdu.get(idu);
    if (!current || candidate.seasonYear > current.seasonYear) {
      latestByIdu.set(idu, candidate);
    }
  }

  return [...latestByIdu.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt", { sensitivity: "base" }),
  );
}

export interface CareerImportSeasonClubSnapshot {
  club: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  titles: number;
  competitions: string[];
}

export interface CareerImportSeasonSnapshot {
  seasonYear: number;
  coach: string;
  country: string | null;
  clubs: CareerImportSeasonClubSnapshot[];
  competitions: string[];
  internationalTitles: number;
}

export interface CareerImportPlayerSnapshot {
  seasonYear: number;
  club: string;
  playerName: string;
  idu: string | null;
  age: number;
  goals: number;
  assists: number;
  ra: number;
  rm: number;
  ca: number;
  cp: number;
  value: number;
  salary: number;
  passPct?: number | null;
  tacklesPer90?: number | null;
  foulsPer90?: number | null;
  shotPct?: number | null;
  xg?: number | null;
  avgRating?: number | null;
}

function pushUnique(target: string[], value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return;
  if (!target.includes(normalized)) target.push(normalized);
}

function normalizeCompLabel(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function fetchCareerImportSeasonsByCoachIdu(
  coachIdu: string,
): Promise<CareerImportSeasonSnapshot[]> {
  const idu = coachIdu.trim();
  if (!idu) return [];

  const [{ data: coachRows }, { data: seasons }, { data: standings }, { data: continental }, { data: international }, { data: clubs }] =
    await Promise.all([
      supabase.from("coaches").select("id,idu,name").eq("idu", idu),
      supabase.from("seasons").select("id,year"),
      supabase.from("standings").select(
        "season_id,club_name,module,division_label,competition,is_champion,played,wins,draws,losses,gf,ga",
      ),
      supabase
        .from("continental_results")
        .select("season_id,competition,team1,team2,winner_club_id"),
      supabase
        .from("international_results")
        .select("season_id,competition,team1,team2,coach1,coach2,winner"),
      supabase.from("clubs").select("id,name"),
    ]);

  const coachIds = (coachRows ?? []).map((row) => row.id).filter(Boolean);
  if (!coachIds.length) return [];

  const { data: assignments } = await supabase
    .from("coach_assignments")
    .select("season_id,coach_id,coach_name,club_name,country_name")
    .in("coach_id", coachIds);

  const yearBySeasonId = new Map((seasons ?? []).map((row) => [row.id, row.year]));
  const clubNameById = new Map((clubs ?? []).map((row) => [row.id, row.name]));

  const bySeason = new Map<
    number,
    {
      coach: string;
      country: string | null;
      clubs: Map<string, CareerImportSeasonClubSnapshot>;
      competitions: string[];
      coachNames: Set<string>;
      internationalTitles: number;
    }
  >();

  for (const row of assignments ?? []) {
    const seasonYear = yearBySeasonId.get(row.season_id);
    if (!seasonYear) continue;
    const bag =
      bySeason.get(seasonYear) ??
      {
        coach: row.coach_name ?? "Treinador",
        country: row.country_name ?? null,
        clubs: new Map<string, CareerImportSeasonClubSnapshot>(),
        competitions: [],
        coachNames: new Set<string>(),
        internationalTitles: 0,
      };

    if (row.coach_name) bag.coachNames.add(row.coach_name);
    if (row.coach_name && !bag.coach) bag.coach = row.coach_name;
    if (row.country_name && !bag.country) bag.country = row.country_name;

    const clubName = String(row.club_name ?? "").trim();
    if (clubName && !bag.clubs.has(clubName)) {
      bag.clubs.set(clubName, {
        club: clubName,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        titles: 0,
        competitions: [],
      });
    }

    bySeason.set(seasonYear, bag);
  }

  for (const row of standings ?? []) {
    const seasonYear = yearBySeasonId.get(row.season_id);
    if (!seasonYear) continue;
    const bag = bySeason.get(seasonYear);
    if (!bag) continue;
    const club = bag.clubs.get(row.club_name);
    if (!club) continue;

    club.matches += Number(row.played ?? 0) || 0;
    club.wins += Number(row.wins ?? 0) || 0;
    club.draws += Number(row.draws ?? 0) || 0;
    club.losses += Number(row.losses ?? 0) || 0;
    club.goalsFor += Number(row.gf ?? 0) || 0;
    club.goalsAgainst += Number(row.ga ?? 0) || 0;
    if (row.is_champion) club.titles += 1;

    const comp = normalizeCompLabel(row.competition) ?? normalizeCompLabel(row.division_label);
    if (comp) {
      pushUnique(club.competitions, comp);
      pushUnique(bag.competitions, comp);
    }
  }

  for (const row of continental ?? []) {
    const seasonYear = yearBySeasonId.get(row.season_id);
    if (!seasonYear) continue;
    const bag = bySeason.get(seasonYear);
    if (!bag) continue;

    const comp = normalizeCompLabel(row.competition);
    if (!comp) continue;

    const clubsInTie = [row.team1, row.team2]
      .map((name) => String(name ?? "").trim())
      .filter(Boolean);
    for (const clubName of clubsInTie) {
      const club = bag.clubs.get(clubName);
      if (!club) continue;
      pushUnique(club.competitions, comp);
      pushUnique(bag.competitions, comp);
    }

    if (row.winner_club_id) {
      const winner = clubNameById.get(row.winner_club_id);
      if (winner) {
        const club = bag.clubs.get(winner);
        if (club) club.titles += 1;
      }
    }
  }

  for (const row of international ?? []) {
    const seasonYear = yearBySeasonId.get(row.season_id);
    if (!seasonYear) continue;
    const bag = bySeason.get(seasonYear);
    if (!bag) continue;
    const comp = normalizeCompLabel(row.competition);
    if (!comp) continue;

    const coach1 = String(row.coach1 ?? "").trim();
    const coach2 = String(row.coach2 ?? "").trim();
    const hasCoach = bag.coachNames.has(coach1) || bag.coachNames.has(coach2);
    if (!hasCoach) continue;

    pushUnique(bag.competitions, comp);

    const winner = String(row.winner ?? "").trim();
    const team1 = String(row.team1 ?? "").trim();
    const team2 = String(row.team2 ?? "").trim();
    if ((coach1 && bag.coachNames.has(coach1) && winner && team1 === winner) ||
      (coach2 && bag.coachNames.has(coach2) && winner && team2 === winner)) {
      bag.internationalTitles += 1;
    }
  }

  return [...bySeason.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([seasonYear, bag]) => ({
      seasonYear,
      coach: bag.coach,
      country: bag.country,
      clubs: [...bag.clubs.values()].sort((a, b) => a.club.localeCompare(b.club, "pt")),
      competitions: [...bag.competitions],
      internationalTitles: bag.internationalTitles,
    }));
}

export async function fetchCareerImportPlayersByCoachIdu(
  coachIdu: string,
): Promise<CareerImportPlayerSnapshot[]> {
  const idu = coachIdu.trim();
  if (!idu) return [];

  const [{ data: coachRows }, { data: seasons }, { data: players }] = await Promise.all([
    supabase.from("coaches").select("id,idu").eq("idu", idu),
    supabase.from("seasons").select("id,year"),
    supabase.from("players").select("season_id,idu,name,club_name,age,gls,ast,salary,ra,rm,ca,cp,vp"),
  ]);

  const coachIds = (coachRows ?? []).map((row) => row.id).filter(Boolean);
  if (!coachIds.length) return [];

  const { data: assignments } = await supabase
    .from("coach_assignments")
    .select("season_id,coach_id,club_name")
    .in("coach_id", coachIds);

  const yearBySeasonId = new Map((seasons ?? []).map((row) => [row.id, row.year]));
  const allowedSeasonClubs = new Map<number, Set<string>>();
  for (const row of assignments ?? []) {
    const seasonYear = yearBySeasonId.get(row.season_id);
    const club = String(row.club_name ?? "").trim();
    if (!seasonYear || !club) continue;
    const set = allowedSeasonClubs.get(seasonYear) ?? new Set<string>();
    set.add(club);
    allowedSeasonClubs.set(seasonYear, set);
  }

  const seasonYears = [...allowedSeasonClubs.keys()].sort((a, b) => a - b);
  const { data: playerStats } = seasonYears.length
    ? await supabase
        .from("player_stats")
        .select(
          "season_year,idu,player_name,club,pass_pct,tackles_per90,fouls_per90,shot_pct,xg,avg_rating",
        )
        .in("season_year", seasonYears)
    : { data: [] as Array<Record<string, unknown>> };

  type StatAgg = {
    passPct: number;
    tacklesPer90: number;
    foulsPer90: number;
    shotPct: number;
    xg: number;
    avgRating: number;
    n: number;
  };
  const statsByKey = new Map<string, StatAgg>();

  for (const row of playerStats ?? []) {
    const seasonYear = Number(row.season_year ?? 0) || 0;
    const club = String(row.club ?? "").trim();
    if (!seasonYear || !club) continue;
    const clubsInSeason = allowedSeasonClubs.get(seasonYear);
    if (!clubsInSeason || !clubsInSeason.has(club)) continue;

    const iduValue = String(row.idu ?? "").trim();
    const playerName = String(row.player_name ?? "").trim();
    const key = `${seasonYear}|${club}|${iduValue || playerName.toLowerCase()}`;
    const agg =
      statsByKey.get(key) ??
      {
        passPct: 0,
        tacklesPer90: 0,
        foulsPer90: 0,
        shotPct: 0,
        xg: 0,
        avgRating: 0,
        n: 0,
      };

    agg.passPct += Number(row.pass_pct ?? 0) || 0;
    agg.tacklesPer90 += Number(row.tackles_per90 ?? 0) || 0;
    agg.foulsPer90 += Number(row.fouls_per90 ?? 0) || 0;
    agg.shotPct += Number(row.shot_pct ?? 0) || 0;
    agg.xg += Number(row.xg ?? 0) || 0;
    agg.avgRating += Number(row.avg_rating ?? 0) || 0;
    agg.n += 1;
    statsByKey.set(key, agg);
  }

  const out = new Map<string, CareerImportPlayerSnapshot>();
  for (const row of players ?? []) {
    const seasonYear = yearBySeasonId.get(row.season_id);
    const club = String(row.club_name ?? "").trim();
    if (!seasonYear || !club) continue;
    const allowedClubs = allowedSeasonClubs.get(seasonYear);
    if (!allowedClubs || !allowedClubs.has(club)) continue;

    const playerName = String(row.name ?? "").trim();
    if (!playerName) continue;
    const iduKey = String(row.idu ?? "").trim();
    const key = `${seasonYear}|${club}|${iduKey || playerName.toLowerCase()}`;

    const snapshot: CareerImportPlayerSnapshot = {
      seasonYear,
      club,
      playerName,
      idu: iduKey || null,
      age: Number(row.age ?? 0) || 0,
      goals: Number(row.gls ?? 0) || 0,
      assists: Number(row.ast ?? 0) || 0,
      ra: Number(row.ra ?? 0) || 0,
      rm: Number(row.rm ?? 0) || 0,
      ca: Number(row.ca ?? 0) || 0,
      cp: Number(row.cp ?? 0) || 0,
      value: Number(row.vp ?? 0) || 0,
      salary: Number(row.salary ?? 0) || 0,
      passPct: null,
      tacklesPer90: null,
      foulsPer90: null,
      shotPct: null,
      xg: null,
      avgRating: null,
    };

    const statAgg = statsByKey.get(key);
    if (statAgg && statAgg.n > 0) {
      snapshot.passPct = statAgg.passPct / statAgg.n;
      snapshot.tacklesPer90 = statAgg.tacklesPer90 / statAgg.n;
      snapshot.foulsPer90 = statAgg.foulsPer90 / statAgg.n;
      snapshot.shotPct = statAgg.shotPct / statAgg.n;
      snapshot.xg = statAgg.xg;
      snapshot.avgRating = statAgg.avgRating / statAgg.n;
    }

    const current = out.get(key);
    if (!current) {
      out.set(key, snapshot);
      continue;
    }

    const currentImpact = current.goals + current.assists;
    const nextImpact = snapshot.goals + snapshot.assists;
    if (nextImpact > currentImpact) out.set(key, snapshot);
  }

  return [...out.values()].sort((a, b) => {
    if (a.seasonYear !== b.seasonYear) return a.seasonYear - b.seasonYear;
    const clubCmp = a.club.localeCompare(b.club, "pt", { sensitivity: "base" });
    if (clubCmp !== 0) return clubCmp;
    return a.playerName.localeCompare(b.playerName, "pt", { sensitivity: "base" });
  });
}
