// Adapter hook: reads existing app data (Rankings + PlayerStats + last import)
// and derives the InsightContext for the Insight Engine, plus lightweight KPIs
// and alerts used by dashboard sections. Read-only — nothing here recomputes
// rankings or mutates any engine state.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRankings } from "@/lib/useRankings";
import { usePlayerStatsData } from "@/lib/usePlayerStatsData";
import { usePlayerUniverse } from "@/lib/player-universe";
import {
  buildContext,
  runEngine,
  type EntityRow,
  type Insight,
  type RankingSnapshot,
} from "@/lib/insights";
import { loadClubAliases, loadReputations, reputationFor } from "@/lib/fm-club-reputation";

export interface DashboardImport {
  id?: string;
  filename: string;
  module: string;
  created_at: string;
  status: string | null;
  warnings: unknown[] | null;
  duration_ms?: number | null;
}

function useRecentImports(limit = 5) {
  return useQuery({
    queryKey: ["dashboard-imports", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("imports")
        .select("id, filename, module, created_at, status, warnings")
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as DashboardImport[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardData() {
  const rankings = useRankings();
  const psQuery = usePlayerStatsData();
  const importsQuery = useRecentImports(5);
  const universe = usePlayerUniverse();

  const derived = useMemo(() => {
    if (!rankings.data) return null;
    const { data, ranks, activeProfileId } = rankings.data;
    const psData = psQuery.data;

    // ---- Entities ----
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
    for (const p of psData?.players ?? []) if (p.competition) compSet.add(p.competition);
    const competitions: EntityRow[] = [...compSet].map((name) => ({ id: name, name }));

    const countrySet = new Set<string>();
    for (const c of Object.values(data.clubCountry)) if (c) countrySet.add(c);
    const countries: EntityRow[] = [...countrySet].map((name) => ({ id: name, name }));

    const players: EntityRow[] = (universe.list ?? []).map((e) => ({
      id: e.idu ? `idu:${String(e.idu)}` : `nm:${String(e.name).toLowerCase()}`,
      name: e.name,
      country: e.country ?? null,
    }));

    // ---- Ranking snapshots from evolution maps ----
    const snapshots: RankingSnapshot[] = [];
    const push = (
      kind: RankingSnapshot["entityKind"],
      evo: Record<string, Record<number, number>>,
    ) => {
      for (const [entityId, byYear] of Object.entries(evo)) {
        const years = Object.keys(byYear)
          .map(Number)
          .sort((a, b) => a - b);
        // Determine positions per year (rank by score within same-year cohort)
        for (const y of years) {
          const rowsForYear: Array<{ id: string; score: number }> = [];
          for (const [id, m] of Object.entries(evo)) {
            const v = m[y];
            if (typeof v === "number") rowsForYear.push({ id, score: v });
          }
          rowsForYear.sort((a, b) => b.score - a.score);
          const position = rowsForYear.findIndex((r) => r.id === entityId) + 1;
          snapshots.push({
            entityId,
            entityKind: kind,
            scope: "global",
            season: String(y),
            position,
            score: byYear[y],
          });
        }
        break; // only need one entity to hydrate the loop above (all others done in first pass)
      }
    };
    // Simpler alternative: iterate years first
    snapshots.length = 0;
    const buildSnapshots = (
      kind: RankingSnapshot["entityKind"],
      evo: Record<string, Record<number, number>>,
    ) => {
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
          snapshots.push({
            entityId: r.id,
            entityKind: kind,
            scope: "global",
            season: String(y),
            position: i + 1,
            score: r.score,
          }),
        );
      }
    };
    buildSnapshots("club", ranks.evolution.clubs);
    buildSnapshots("coach", ranks.evolution.coaches);
    buildSnapshots("country", ranks.evolution.countries);

    // ---- Insight context ----
    const ctx = buildContext({
      rankings: snapshots,
      clubs,
      players,
      coaches,
      competitions,
      countries,
    });

    // ---- KPIs ----
    const latestYear = data.standings.length
      ? Math.max(...data.standings.map((s) => s.season_year))
      : 0;

    // ---- Alerts (reused from previous index) ----
    const playersPerClubLatest = new Map<string, number>();
    for (const p of psData?.players ?? []) {
      if (p.season_year !== latestYear || !p.club) continue;
      playersPerClubLatest.set(p.club, (playersPerClubLatest.get(p.club) ?? 0) + 1);
    }
    const clubsWithoutPlayers = allClubs.filter((c) => (playersPerClubLatest.get(c) ?? 0) === 0);
    const playersWithoutClub = (psData?.players ?? []).filter(
      (p) => !p.club || !p.club.trim(),
    ).length;
    const latestCoachYear = (data.coaches ?? []).length
      ? Math.max(...(data.coaches ?? []).map((c) => c.season_year))
      : 0;
    const coachesWithoutClub = (data.coaches ?? []).filter(
      (c) => c.season_year === latestCoachYear && !c.club_name,
    ).length;

    const aliases = loadClubAliases();
    const reps = loadReputations();
    const compClubMap = new Map<string, Set<string>>();
    for (const p of psData?.players ?? []) {
      if (!p.competition) continue;
      let s = compClubMap.get(p.competition);
      if (!s) {
        s = new Set();
        compClubMap.set(p.competition, s);
      }
      if (p.club) s.add(p.club);
    }
    const compsMissingRep: string[] = [];
    for (const [comp, cs] of compClubMap) {
      const reputations: number[] = [];
      for (const c of cs) {
        const v = reputationFor(c, aliases, reps);
        if (typeof v === "number") reputations.push(v);
      }
      if (reputations.length === 0) compsMissingRep.push(comp);
    }

    // ---- Highlights derived from ranking evolution ----
    const highlights = computeHighlights(ranks.evolution.clubs);

    // ---- Smart profile heuristics (from existing standings) ----
    const smart = computeSmartProfiles(
      data.standings,
      data.coaches ?? [],
      psData?.players ?? [],
      latestYear,
    );

    return {
      ctx,
      kpis: {
        clubs: allClubs.length,
        players: players.length,
        coaches: coachSet.size,
        competitions: compSet.size,
        countries: countrySet.size,
        seasons: data.seasons.length,
        activeProfileId,
      },
      latestYear,
      alerts: {
        clubsWithoutPlayers: clubsWithoutPlayers.length,
        playersWithoutClub,
        coachesWithoutClub,
        compsMissingRep: compsMissingRep.length,
      },
      highlights,
      smart,
      ranks,
      psData,
    };
  }, [rankings.data, psQuery.data, universe.list]);

  const report = useQuery({
    queryKey: ["dashboard-insights", derived?.kpis.seasons ?? 0, derived?.latestYear ?? 0],
    queryFn: async () => {
      if (!derived) return { insights: [] as Insight[] };
      const r = await runEngine(derived.ctx, { limit: 80 });
      return { insights: r.insights };
    },
    enabled: !!derived,
    staleTime: 60_000,
  });

  return {
    isLoading: rankings.isLoading,
    derived,
    imports: importsQuery.data ?? [],
    lastImport: importsQuery.data?.[0] ?? null,
    insights: report.data?.insights ?? [],
  };
}

function computeHighlights(evo: Record<string, Record<number, number>>) {
  let biggestRise: { name: string; delta: number } | null = null;
  let biggestFall: { name: string; delta: number } | null = null;
  let bestSeason: { name: string; year: number; value: number } | null = null;
  let mostRegular: { name: string; std: number; mean: number } | null = null;

  for (const [name, byYear] of Object.entries(evo)) {
    const years = Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b);
    if (years.length < 2) continue;
    const last = byYear[years[years.length - 1]] ?? 0;
    const prev = byYear[years[years.length - 2]] ?? 0;
    const delta = last - prev;
    if (!biggestRise || delta > biggestRise.delta) biggestRise = { name, delta };
    if (!biggestFall || delta < biggestFall.delta) biggestFall = { name, delta };

    for (const y of years) {
      const v = byYear[y] ?? 0;
      if (!bestSeason || v > bestSeason.value) bestSeason = { name, year: y, value: v };
    }

    const vals = years.map((y) => byYear[y] ?? 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean > 0) {
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      const std = Math.sqrt(variance);
      const cv = std / mean;
      if (!mostRegular || cv < mostRegular.std) mostRegular = { name, std: cv, mean };
    }
  }
  return { biggestRise, biggestFall, bestSeason, mostRegular };
}

function computeSmartProfiles(
  standings: Array<{
    season_year: number;
    club_name: string;
    gf?: number | null;
    ga?: number | null;
    competition?: string | null;
    played?: number | null;
  }>,
  coaches: Array<{ season_year: number; name: string; club_name: string | null }>,
  players: Array<{
    season_year: number;
    player_name: string;
    club?: string | null;
    gls?: number | null;
    ast?: number | null;
  }>,
  latestYear: number,
) {
  // Most offensive club (latest season, highest GF)
  let offensiveClub: { name: string; value: number } | null = null;
  // Most defensive club (fewest GA, min 10 games)
  let defensiveClub: { name: string; value: number } | null = null;
  for (const s of standings) {
    if (s.season_year !== latestYear) continue;
    if (typeof s.gf === "number") {
      if (!offensiveClub || s.gf > offensiveClub.value)
        offensiveClub = { name: s.club_name, value: s.gf };
    }
    if (typeof s.ga === "number" && (s.played ?? 0) >= 10) {
      if (!defensiveClub || s.ga < defensiveClub.value)
        defensiveClub = { name: s.club_name, value: s.ga };
    }
  }

  // Highest-scoring league (avg goals/game in latest season)
  const leagueAgg = new Map<string, { g: number; p: number }>();
  for (const s of standings) {
    if (s.season_year !== latestYear || !s.competition) continue;
    const cur = leagueAgg.get(s.competition) ?? { g: 0, p: 0 };
    cur.g += s.gf ?? 0;
    cur.p += s.played ?? 0;
    leagueAgg.set(s.competition, cur);
  }
  let highestScoringLeague: { name: string; value: number } | null = null;
  for (const [name, v] of leagueAgg) {
    if (v.p < 20) continue;
    const gpg = v.g / v.p;
    if (!highestScoringLeague || gpg > highestScoringLeague.value)
      highestScoringLeague = { name, value: gpg };
  }

  // Most regular coach (most distinct seasons present)
  const coachYears = new Map<string, Set<number>>();
  for (const c of coaches) {
    if (!c.name) continue;
    let s = coachYears.get(c.name);
    if (!s) {
      s = new Set();
      coachYears.set(c.name, s);
    }
    s.add(c.season_year);
  }
  let regularCoach: { name: string; value: number } | null = null;
  for (const [name, s] of coachYears) {
    if (!regularCoach || s.size > regularCoach.value) regularCoach = { name, value: s.size };
  }

  // Revelation player (highest goals + assists in latest season)
  let revelation: { name: string; value: number } | null = null;
  for (const p of players) {
    if (p.season_year !== latestYear) continue;
    const v = (p.gls ?? 0) + (p.ast ?? 0);
    if (!revelation || v > revelation.value) revelation = { name: p.player_name, value: v };
  }

  return { offensiveClub, defensiveClub, highestScoringLeague, regularCoach, revelation };
}
