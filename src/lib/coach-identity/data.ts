// Data loader for coach identity: fetches coach assignments + linked player profiles.
// Uses one bulk query per coach because player_profiles has ~7k rows and is small.
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface PlayerProfileRow {
  season_year: number;
  club: string | null;
  player_name: string;
  idu: string | null;
  age: number | null;
  ca: number | null;
  cp: number | null;
  vp: number | null;
  salary: number | null;
  height: number | null;
  weight: number | null;
  preferred_foot: string | null;
  reputation: number | null;
  nationality: string | null;
  continent: string | null;
  primary_position: string | null;
  attributes: Record<string, number> | null;
}

export interface CoachAssignmentLite {
  season_year: number | null;
  club_name: string | null;
  module: string;
}

export interface CoachRosterData {
  assignments: CoachAssignmentLite[];
  players: PlayerProfileRow[];
}

function keyOf(club: string | null | undefined, year: number | null | undefined): string {
  return `${(club ?? "").toLowerCase().trim()}::${year ?? 0}`;
}

export async function fetchCoachRoster(coachName: string): Promise<CoachRosterData> {
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => Promise<{ data: unknown }>;
      };
    };
  };
  // 1) Coach's assignments
  const [{ data: seasons }, { data: assignments }] = await Promise.all([
    (supabase.from("seasons").select("id, year") as unknown as Promise<{
      data: Array<{ id: string; year: number }> | null;
    }>),
    (supabase
      .from("coach_assignments")
      .select("season_id, module, club_name")
      .eq("coach_name", coachName) as unknown as Promise<{
      data: Array<{ season_id: string; module: string; club_name: string | null }> | null;
    }>),
  ]);
  void sb;
  const yearById = new Map<string, number>();
  for (const s of seasons ?? []) yearById.set(s.id, s.year);

  const assign: CoachAssignmentLite[] = (assignments ?? [])
    .map((a) => ({
      season_year: yearById.get(a.season_id) ?? null,
      club_name: a.club_name,
      module: a.module,
    }))
    .filter((a) => a.season_year != null && a.club_name);

  // 2) All player_profiles rows for matching (club, year) pairs
  if (!assign.length) return { assignments: assign, players: [] };

  const years = [...new Set(assign.map((a) => a.season_year!).filter(Boolean))];
  const clubs = [...new Set(assign.map((a) => a.club_name!).filter(Boolean))];

  const { data: rawPlayers } = (await supabase
    .from("player_profiles")
    .select(
      "season_year, club, player_name, idu, age, ca, cp, vp, salary, height, weight, preferred_foot, reputation, nationality, continent, primary_position, attributes",
    )
    .in("season_year", years)
    .in("club", clubs)) as unknown as { data: PlayerProfileRow[] | null };

  const validKeys = new Set(assign.map((a) => keyOf(a.club_name, a.season_year)));
  const players = (rawPlayers ?? []).filter((p) => validKeys.has(keyOf(p.club, p.season_year)));

  return { assignments: assign, players };
}

export function useCoachRoster(coachName: string) {
  return useQuery({
    queryKey: ["coach-roster", coachName],
    queryFn: () => fetchCoachRoster(coachName),
    staleTime: 5 * 60 * 1000,
    enabled: !!coachName,
  });
}

// Universe: aggregate stats across ALL coaches for percentile computations.
// Loads all coach_assignments + all player_profiles once.
export interface UniverseData {
  playersByCoach: Map<string, PlayerProfileRow[]>;
  assignmentsByCoach: Map<string, CoachAssignmentLite[]>;
}

export async function fetchCoachUniverse(): Promise<UniverseData> {
  const [{ data: seasons }, { data: assignments }, { data: players }] = (await Promise.all([
    supabase.from("seasons").select("id, year"),
    supabase.from("coach_assignments").select("season_id, module, coach_name, club_name"),
    supabase
      .from("player_profiles")
      .select(
        "season_year, club, player_name, idu, age, ca, cp, vp, salary, height, weight, preferred_foot, reputation, nationality, continent, primary_position, attributes",
      ),
  ])) as unknown as [
    { data: Array<{ id: string; year: number }> | null },
    {
      data: Array<{
        season_id: string;
        module: string;
        coach_name: string;
        club_name: string | null;
      }> | null;
    },
    { data: PlayerProfileRow[] | null },
  ];

  const yearById = new Map<string, number>();
  for (const s of seasons ?? []) yearById.set(s.id, s.year);

  // Index players by (club, year)
  const playersByKey = new Map<string, PlayerProfileRow[]>();
  for (const p of players ?? []) {
    const k = keyOf(p.club, p.season_year);
    const arr = playersByKey.get(k) ?? [];
    arr.push(p);
    playersByKey.set(k, arr);
  }

  const playersByCoach = new Map<string, PlayerProfileRow[]>();
  const assignmentsByCoach = new Map<string, CoachAssignmentLite[]>();
  for (const a of assignments ?? []) {
    const year = yearById.get(a.season_id) ?? null;
    if (!year || !a.club_name) continue;
    const lite: CoachAssignmentLite = {
      season_year: year,
      club_name: a.club_name,
      module: a.module,
    };
    const list = assignmentsByCoach.get(a.coach_name) ?? [];
    list.push(lite);
    assignmentsByCoach.set(a.coach_name, list);

    const key = keyOf(a.club_name, year);
    const roster = playersByKey.get(key) ?? [];
    if (!roster.length) continue;
    const bag = playersByCoach.get(a.coach_name) ?? [];
    for (const p of roster) bag.push(p);
    playersByCoach.set(a.coach_name, bag);
  }
  return { playersByCoach, assignmentsByCoach };
}

export function useCoachUniverse() {
  return useQuery({
    queryKey: ["coach-universe"],
    queryFn: fetchCoachUniverse,
    staleTime: 10 * 60 * 1000,
  });
}
