// Global Awards engine — Fase C of Coach/Global Identity work.
// Deterministic (no AI). Computes 24 award categories for each season/scope
// from existing tables. Categories that need data not currently ingested
// return null so the UI can show "Sem dados suficientes".
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { parsePrimaryPosition, type PositionGroup } from "@/lib/coach-identity/positions";

export type AwardScope =
  | "superleague"
  | "national"
  | "continental"
  | "international"
  | "world";

export const SCOPE_LABEL: Record<AwardScope, string> = {
  superleague: "Super League",
  national: "Ligas Nacionais",
  continental: "Competições Continentais",
  international: "Competições Internacionais",
  world: "Mundial",
};

export interface AwardWinner {
  name: string;
  subject: string; // e.g. club, coach, player
  detail?: string; // extra line
  metric: string; // metric shown (right-side)
  entity?: { kind: "player" | "coach" | "club"; name: string };
}

export interface AwardCategory {
  id: string;
  label: string;
  description: string;
  winner: AwardWinner | null;
}

// ---------- Types ----------
interface PlayerRow {
  season_year: number;
  idu: string | null;
  player_name: string;
  club: string | null;
  age: number | null;
  ca: number | null;
  cp: number | null;
  vp: number | null;
  reputation: number | null;
  nationality: string | null;
  continent: string | null;
  primary_position: string | null;
}
interface StandingRow {
  season_year: number;
  module: string;
  competition: string | null;
  club_name: string | null;
  position: number | null;
  played: number | null;
  wins: number | null;
  gf: number | null;
  ga: number | null;
  points: number | null;
  is_champion: boolean | null;
}
interface TransferRow {
  season_year: number | null;
  person_type: string;
  person_name: string;
  from_club_name: string | null;
  to_club_name: string | null;
  value: number | null;
}
interface CoachAssignRow {
  season_year: number;
  module: string;
  coach_name: string;
  club_name: string | null;
  country_name: string | null;
}
interface ContinentalRow {
  season_year: number;
  competition: string | null;
  team1: string | null;
  team2: string | null;
  winner_club: string | null;
}
interface InternationalRow {
  season_year: number;
  competition: string | null;
  team1: string | null;
  team2: string | null;
  winner: string | null;
  coach1: string | null;
  coach2: string | null;
}

export interface AwardsDataset {
  seasons: number[];
  players: PlayerRow[];
  standings: StandingRow[];
  transfers: TransferRow[];
  coaches: CoachAssignRow[];
  continental: ContinentalRow[];
  international: InternationalRow[];
}

// ---------- Loader ----------
export async function fetchAwardsDataset(): Promise<AwardsDataset> {
  const [
    { data: seasonsRaw },
    { data: players },
    { data: standings },
    { data: transfers },
    { data: coachRaw },
    { data: contRaw },
    { data: intlRaw },
  ] = (await Promise.all([
    supabase.from("seasons").select("id, year"),
    supabase
      .from("player_profiles")
      .select(
        "season_year, idu, player_name, club, age, ca, cp, vp, reputation, nationality, continent, primary_position",
      ),
    supabase
      .from("standings")
      .select(
        "season_id, module, competition, club_name, position, played, wins, gf, ga, points, is_champion",
      ),
    supabase
      .from("transfers")
      .select("season_year, person_type, person_name, from_club_name, to_club_name, value"),
    supabase
      .from("coach_assignments")
      .select("season_id, module, coach_name, club_name, country_name"),
    supabase
      .from("continental_results")
      .select("season_id, competition, team1, team2, winner_club_id, club1_id, club2_id"),
    supabase
      .from("international_results")
      .select("season_id, competition, team1, team2, winner, coach1, coach2"),
  ])) as unknown as [
    { data: Array<{ id: string; year: number }> | null },
    { data: PlayerRow[] | null },
    {
      data: Array<
        Omit<StandingRow, "season_year"> & { season_id: string }
      > | null;
    },
    { data: TransferRow[] | null },
    {
      data: Array<
        Omit<CoachAssignRow, "season_year"> & { season_id: string }
      > | null;
    },
    {
      data: Array<{
        season_id: string;
        competition: string | null;
        team1: string | null;
        team2: string | null;
        winner_club_id: string | null;
        club1_id: string | null;
        club2_id: string | null;
      }> | null;
    },
    {
      data: Array<
        Omit<InternationalRow, "season_year"> & { season_id: string }
      > | null;
    },
  ];

  const yearById = new Map<string, number>();
  for (const s of seasonsRaw ?? []) yearById.set(s.id, s.year);
  const yearOf = (id: string) => yearById.get(id) ?? 0;

  const st: StandingRow[] = (standings ?? []).map((r) => ({
    ...r,
    season_year: yearOf(r.season_id),
  }));
  const co: CoachAssignRow[] = (coachRaw ?? []).map((r) => ({
    ...r,
    season_year: yearOf(r.season_id),
  }));

  // Resolve continental winner club via standings/club id → club name
  // We derive winner_club by comparing winner_club_id to team1/team2 heuristically.
  const cn: ContinentalRow[] = (contRaw ?? []).map((r) => {
    const winnerClub =
      r.winner_club_id === r.club1_id
        ? r.team1
        : r.winner_club_id === r.club2_id
          ? r.team2
          : r.team1 ?? r.team2;
    return {
      season_year: yearOf(r.season_id),
      competition: r.competition,
      team1: r.team1,
      team2: r.team2,
      winner_club: winnerClub,
    };
  });
  const it: InternationalRow[] = (intlRaw ?? []).map((r) => ({
    ...r,
    season_year: yearOf(r.season_id),
  }));

  const seasons = [
    ...new Set([
      ...(players ?? []).map((p) => p.season_year),
      ...st.map((s) => s.season_year),
    ]),
  ]
    .filter((y) => y > 0)
    .sort((a, b) => b - a);

  return {
    seasons,
    players: players ?? [],
    standings: st,
    transfers: transfers ?? [],
    coaches: co,
    continental: cn,
    international: it,
  };
}

export function useAwardsDataset() {
  return useQuery({
    queryKey: ["awards-dataset"],
    queryFn: fetchAwardsDataset,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------- Scope helpers ----------
function normKey(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/** Clubs playing in this scope for a given season. */
function clubsInScope(
  ds: AwardsDataset,
  season: number,
  scope: AwardScope,
): Set<string> {
  if (scope === "superleague" || scope === "national") {
    const target = scope === "superleague" ? "superleague" : "national";
    const clubs = new Set<string>();
    for (const s of ds.standings) {
      if (s.season_year === season && s.module === target && s.club_name) {
        clubs.add(normKey(s.club_name));
      }
    }
    return clubs;
  }
  if (scope === "continental") {
    const clubs = new Set<string>();
    for (const r of ds.continental) {
      if (r.season_year !== season) continue;
      if (r.team1) clubs.add(normKey(r.team1));
      if (r.team2) clubs.add(normKey(r.team2));
    }
    return clubs;
  }
  if (scope === "international") return new Set(); // national teams, not clubs
  // world: all
  const all = new Set<string>();
  for (const p of ds.players) if (p.season_year === season && p.club) all.add(normKey(p.club));
  return all;
}

function seasonPlayers(ds: AwardsDataset, season: number, scope: AwardScope): PlayerRow[] {
  if (scope === "international") return [];
  const scopeClubs = clubsInScope(ds, season, scope);
  return ds.players.filter(
    (p) => p.season_year === season && p.club && (scope === "world" || scopeClubs.has(normKey(p.club))),
  );
}
function seasonStandings(ds: AwardsDataset, season: number, scope: AwardScope): StandingRow[] {
  if (scope === "superleague") return ds.standings.filter((s) => s.season_year === season && s.module === "superleague");
  if (scope === "national") return ds.standings.filter((s) => s.season_year === season && s.module === "national");
  if (scope === "world") return ds.standings.filter((s) => s.season_year === season);
  return [];
}
function seasonTransfers(ds: AwardsDataset, season: number, scope: AwardScope): TransferRow[] {
  const rows = ds.transfers.filter((t) => t.season_year === season && t.person_type === "player");
  if (scope === "world") return rows;
  if (scope === "international") return [];
  const scopeClubs = clubsInScope(ds, season, scope);
  return rows.filter(
    (t) =>
      (t.to_club_name && scopeClubs.has(normKey(t.to_club_name))) ||
      (t.from_club_name && scopeClubs.has(normKey(t.from_club_name))),
  );
}
function seasonCoaches(ds: AwardsDataset, season: number, scope: AwardScope): CoachAssignRow[] {
  if (scope === "superleague") return ds.coaches.filter((c) => c.season_year === season && c.module === "superleague");
  if (scope === "national") return ds.coaches.filter((c) => c.season_year === season && c.module === "national");
  if (scope === "continental") return ds.coaches.filter((c) => c.season_year === season && c.module === "continental");
  if (scope === "international") return ds.coaches.filter((c) => c.season_year === season && c.module === "international");
  return ds.coaches.filter((c) => c.season_year === season);
}

// ---------- Award computations ----------
function fmtMoney(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "€0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${abs.toFixed(0)}`;
}

function bestPlayer(players: PlayerRow[], filter?: (p: PlayerRow) => boolean, sortKey: "ca" | "reputation" | "vp" = "ca"): AwardWinner | null {
  const pool = filter ? players.filter(filter) : players;
  if (!pool.length) return null;
  const best = pool.reduce((a, b) => ((b[sortKey] ?? 0) > (a[sortKey] ?? 0) ? b : a));
  const val = best[sortKey] ?? 0;
  if (!val) return null;
  return {
    name: best.player_name,
    subject: best.club ?? "",
    detail: best.primary_position ?? undefined,
    metric: sortKey === "vp" ? fmtMoney(Number(val)) : Math.round(Number(val)).toLocaleString("pt-PT"),
    entity: { kind: "player", name: best.player_name },
  };
}

function bestByPosition(players: PlayerRow[], group: PositionGroup): AwardWinner | null {
  return bestPlayer(players, (p) => parsePrimaryPosition(p.primary_position).group === group);
}

function championClub(
  ds: AwardsDataset,
  season: number,
  scope: AwardScope,
): AwardWinner | null {
  if (scope === "superleague" || scope === "national") {
    const st = seasonStandings(ds, season, scope).filter((s) => s.is_champion && s.club_name);
    if (!st.length) return null;
    // Pick highest points or first
    const winner = st.reduce((a, b) => ((b.points ?? 0) > (a.points ?? 0) ? b : a));
    return {
      name: winner.club_name!,
      subject: winner.competition ?? scope,
      metric: `${winner.wins ?? 0}V · ${winner.points ?? 0} pts`,
      entity: { kind: "club", name: winner.club_name! },
    };
  }
  if (scope === "continental") {
    const finals = ds.continental.filter((c) => c.season_year === season && c.winner_club);
    if (!finals.length) return null;
    const top = finals[0];
    return {
      name: top.winner_club!,
      subject: top.competition ?? "Continental",
      metric: "Vencedor",
      entity: { kind: "club", name: top.winner_club! },
    };
  }
  if (scope === "international") {
    const finals = ds.international.filter((r) => r.season_year === season && r.winner);
    if (!finals.length) return null;
    const top = finals[0];
    return {
      name: top.winner!,
      subject: top.competition ?? "Internacional",
      metric: "Vencedor",
    };
  }
  // world: pick highest points across all standings, else first continental winner
  const all = seasonStandings(ds, season, "world").filter((s) => s.is_champion && s.club_name);
  if (all.length) {
    const winner = all.reduce((a, b) => ((b.points ?? 0) > (a.points ?? 0) ? b : a));
    return {
      name: winner.club_name!,
      subject: winner.competition ?? "",
      metric: `${winner.points ?? 0} pts`,
      entity: { kind: "club", name: winner.club_name! },
    };
  }
  return null;
}

function coachOfChampion(
  ds: AwardsDataset,
  season: number,
  scope: AwardScope,
): AwardWinner | null {
  const champ = championClub(ds, season, scope);
  if (!champ) return null;
  if (scope === "international") {
    // Find winning team's coach from international_results
    const row = ds.international.find(
      (r) => r.season_year === season && r.winner === champ.name,
    );
    const coach = row?.winner === row?.team1 ? row?.coach1 : row?.coach2;
    if (!coach) return null;
    return { name: coach, subject: champ.name, metric: champ.subject, entity: { kind: "coach", name: coach } };
  }
  // Match by club_name in coach_assignments
  const coaches = seasonCoaches(ds, season, scope === "world" ? "world" : scope);
  const key = normKey(champ.name);
  const match = coaches.find((c) => normKey(c.club_name) === key);
  if (!match) return null;
  return {
    name: match.coach_name,
    subject: champ.name,
    metric: champ.subject,
    entity: { kind: "coach", name: match.coach_name },
  };
}

function bestOffense(ds: AwardsDataset, season: number, scope: AwardScope): AwardWinner | null {
  const rows = seasonStandings(ds, season, scope).filter((s) => s.club_name && (s.gf ?? 0) > 0);
  if (!rows.length) return null;
  const top = rows.reduce((a, b) => ((b.gf ?? 0) > (a.gf ?? 0) ? b : a));
  return {
    name: top.club_name!,
    subject: top.competition ?? "",
    metric: `${top.gf} golos`,
    entity: { kind: "club", name: top.club_name! },
  };
}
function bestDefenseClub(ds: AwardsDataset, season: number, scope: AwardScope): AwardWinner | null {
  const rows = seasonStandings(ds, season, scope).filter((s) => s.club_name && (s.played ?? 0) > 0);
  if (!rows.length) return null;
  const top = rows.reduce((a, b) => ((b.ga ?? 999) < (a.ga ?? 999) ? b : a));
  return {
    name: top.club_name!,
    subject: top.competition ?? "",
    metric: `${top.ga} sofridos`,
    entity: { kind: "club", name: top.club_name! },
  };
}
function bestPosition(ds: AwardsDataset, season: number, scope: AwardScope): AwardWinner | null {
  const rows = seasonStandings(ds, season, scope).filter((s) => s.club_name && s.position);
  if (!rows.length) return null;
  const top = rows.reduce((a, b) => ((b.points ?? 0) > (a.points ?? 0) ? b : a));
  return {
    name: top.club_name!,
    subject: top.competition ?? "",
    metric: `${top.position}º · ${top.points} pts`,
    entity: { kind: "club", name: top.club_name! },
  };
}

function biggestSale(ds: AwardsDataset, season: number, scope: AwardScope): AwardWinner | null {
  const rows = seasonTransfers(ds, season, scope).filter((t) => (t.value ?? 0) > 0);
  if (!rows.length) return null;
  const top = rows.reduce((a, b) => ((b.value ?? 0) > (a.value ?? 0) ? b : a));
  return {
    name: top.person_name,
    subject: `${top.from_club_name ?? "?"} → ${top.to_club_name ?? "?"}`,
    metric: fmtMoney(Number(top.value)),
    entity: { kind: "player", name: top.person_name },
  };
}
function biggestPurchase(ds: AwardsDataset, season: number, scope: AwardScope): AwardWinner | null {
  return biggestSale(ds, season, scope); // same event; distinguished by frame
}

function bestSigning(
  ds: AwardsDataset,
  season: number,
  scope: AwardScope,
): AwardWinner | null {
  // Arrival with highest CA in its new club's season snapshot
  const transfers = seasonTransfers(ds, season, scope);
  const arrivals = transfers.filter((t) => t.to_club_name);
  if (!arrivals.length) return null;
  const players = seasonPlayers(ds, season, scope);
  const byName = new Map<string, PlayerRow>();
  for (const p of players) byName.set(normKey(p.player_name), p);
  let best: { t: TransferRow; ca: number } | null = null;
  for (const t of arrivals) {
    const snap = byName.get(normKey(t.person_name));
    const ca = snap?.ca ?? 0;
    if (!best || ca > best.ca) best = { t, ca };
  }
  if (!best || best.ca === 0) return null;
  return {
    name: best.t.person_name,
    subject: `→ ${best.t.to_club_name}`,
    metric: `CA ${best.ca}`,
    entity: { kind: "player", name: best.t.person_name },
  };
}

function revelation(ds: AwardsDataset, season: number, scope: AwardScope): AwardWinner | null {
  return bestPlayer(seasonPlayers(ds, season, scope), (p) => (p.age ?? 99) <= 21);
}

function biggestEvolution(
  ds: AwardsDataset,
  season: number,
  scope: AwardScope,
): AwardWinner | null {
  const curr = seasonPlayers(ds, season, scope);
  const prev = new Map<string, PlayerRow>();
  for (const p of ds.players) {
    if (p.season_year !== season - 1) continue;
    const key = normKey(p.idu ?? p.player_name);
    prev.set(key, p);
  }
  if (!prev.size) return null;
  let best: { p: PlayerRow; delta: number } | null = null;
  for (const p of curr) {
    const key = normKey(p.idu ?? p.player_name);
    const before = prev.get(key);
    if (!before || !before.ca || !p.ca) continue;
    const delta = p.ca - before.ca;
    if (!best || delta > best.delta) best = { p, delta };
  }
  if (!best || best.delta <= 0) return null;
  return {
    name: best.p.player_name,
    subject: best.p.club ?? "",
    metric: `+${best.delta} CA`,
    entity: { kind: "player", name: best.p.player_name },
  };
}

// ---------- Category registry ----------
export interface CategoryDef {
  id: string;
  label: string;
  description: string;
  compute: (ds: AwardsDataset, season: number, scope: AwardScope) => AwardWinner | null;
}

export const CATEGORY_DEFS: CategoryDef[] = [
  { id: "player-of-the-year", label: "Melhor Jogador", description: "Maior CA no âmbito", compute: (ds, s, sc) => bestPlayer(seasonPlayers(ds, s, sc)) },
  { id: "best-gk", label: "Melhor Guarda-Redes", description: "Melhor CA entre guarda-redes", compute: (ds, s, sc) => bestByPosition(seasonPlayers(ds, s, sc), "GK") },
  { id: "best-def", label: "Melhor Defesa", description: "Melhor CA entre defesas", compute: (ds, s, sc) => bestByPosition(seasonPlayers(ds, s, sc), "DEF") },
  { id: "best-mid", label: "Melhor Médio", description: "Melhor CA entre médios", compute: (ds, s, sc) => bestByPosition(seasonPlayers(ds, s, sc), "MID") },
  { id: "best-att", label: "Melhor Avançado", description: "Melhor CA entre avançados", compute: (ds, s, sc) => bestByPosition(seasonPlayers(ds, s, sc), "ATT") },
  { id: "top-scorer", label: "Melhor Marcador", description: "Requer estatísticas de jogo (golos)", compute: () => null },
  { id: "top-assist", label: "Melhor Assistente", description: "Requer estatísticas de jogo (assistências)", compute: () => null },
  { id: "best-rating", label: "Melhor Média", description: "Maior reputação no âmbito", compute: (ds, s, sc) => bestPlayer(seasonPlayers(ds, s, sc), undefined, "reputation") },
  { id: "best-position", label: "Melhor Classificação", description: "Clube com melhor prestação", compute: bestPosition },
  { id: "coach-of-the-year", label: "Treinador do Ano", description: "Treinador do clube campeão", compute: coachOfChampion },
  { id: "club-of-the-year", label: "Clube do Ano", description: "Campeão do âmbito", compute: championClub },
  { id: "best-signing", label: "Melhor Reforço", description: "Chegada com maior CA no plantel", compute: bestSigning },
  { id: "revelation", label: "Revelação", description: "Melhor jogador com ≤21 anos", compute: revelation },
  { id: "biggest-evolution", label: "Maior Evolução", description: "Maior Δ CA vs época anterior", compute: biggestEvolution },
  { id: "best-transfer", label: "Melhor Transferência", description: "Transferência mais valiosa do âmbito", compute: biggestSale },
  { id: "biggest-sale", label: "Maior Venda", description: "Saída de maior valor", compute: biggestSale },
  { id: "biggest-purchase", label: "Maior Compra", description: "Compra de maior valor", compute: biggestPurchase },
  { id: "best-attack", label: "Melhor Ataque", description: "Clube com mais golos marcados", compute: bestOffense },
  { id: "best-defense", label: "Melhor Defesa (clube)", description: "Clube com menos golos sofridos", compute: bestDefenseClub },
  { id: "fair-play", label: "Fair Play", description: "Requer estatísticas de cartões", compute: () => null },
  { id: "team-of-year", label: "Melhor Equipa da Época", description: "Campeão do âmbito", compute: championClub },
  { id: "eleven-of-year", label: "Onze do Ano", description: "Requer estatísticas de rating", compute: () => null },
  { id: "bench-of-year", label: "Banco do Ano", description: "Requer estatísticas de rating", compute: () => null },
];

export function computeAwards(
  ds: AwardsDataset,
  season: number,
  scope: AwardScope,
): AwardCategory[] {
  return CATEGORY_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    winner: def.compute(ds, season, scope),
  }));
}
