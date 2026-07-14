import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClubPlantelSection, ClubSeasonFilter } from "@/components/ClubPlantelSection";
import { ClubReputationSection } from "@/components/ClubReputationSection";
import { PlayerAchievementsSection } from "@/components/PlayerAchievementsSection";
import { CoachAttributesSection } from "@/components/CoachAttributesSection";
import { CompetitionRecordsSection } from "@/components/RecordsSection";
import { DesafiosProfileCard } from "@/components/DesafiosProfileCard";
import { ClubNewStatsSection, CompetitionNewStatsSection } from "@/components/NewStatsSections";
import { usePlayerStatsData } from "@/lib/usePlayerStatsData";
import { usePlayerUniverse } from "@/lib/player-universe";
import { listDictionaryEntries } from "@/lib/dictionary";
import { fmtNum } from "@/lib/fmt";
import type { ProfileContext } from "@/lib/profile/types";
import type { PlayerStatRow } from "@/lib/fm-player-stats-db";

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function seasonList(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => b - a);
}

function canonicalCompetitionName(row: {
  competition?: string | null;
  division_label?: string | null;
  module?: string | null;
  division_num?: number | null;
}): string {
  return (
    row.competition ??
    row.division_label ??
    (row.module === "superleague" && row.division_num != null ? `Div. ${row.division_num}` : "")
  );
}

const PLAYER_STAT_GETTERS: Record<string, (row: PlayerStatRow) => number | null | undefined> = {
  "player.metric.stat_appearances": (row) => row.games,
  "player.metric.goals": (row) => row.gls,
  "player.metric.assists": (row) => row.ast,
  "player.metric.xg": (row) => row.xg,
  "player.metric.stat_man_of_the_match": (row) => row.hdj,
  "player.metric.pass_completion_pct": (row) => row.pass_pct,
  "player.metric.stat_tackles_per_90": (row) => row.tackles_per90,
  "player.metric.stat_fouls_per_90": (row) => row.fouls_per90,
  "player.metric.stat_shots_on_target_pct": (row) => row.shot_pct,
  "player.metric.stat_yellow_cards": (row) => row.yellows,
  "player.metric.stat_red_cards": (row) => row.reds,
  "player.metric.stat_average_rating": (row) => row.avg_rating,
};

export function PlayerHistorySections({ ctx }: { ctx: ProfileContext }) {
  const { data: statsData, isLoading } = usePlayerStatsData();
  const universe = usePlayerUniverse();

  const rows = useMemo(() => {
    if (!statsData) return [] as PlayerStatRow[];
    const name = norm(ctx.name);
    return statsData.players
      .filter((row) => norm(row.player_name) === name)
      .sort(
        (a, b) =>
          b.season_year - a.season_year || a.competition.localeCompare(b.competition, "pt-PT"),
      );
  }, [statsData, ctx.name]);

  const years = useMemo(() => seasonList(rows.map((row) => row.season_year)), [rows]);
  const [season, setSeason] = useState<number | null>(years[0] ?? null);

  useEffect(() => {
    if (!years.length) {
      if (season !== null) setSeason(null);
      return;
    }
    if (season == null || !years.includes(season)) setSeason(years[0]);
  }, [years, season]);

  const seasonRows = useMemo(
    () => (season == null ? rows : rows.filter((row) => row.season_year === season)),
    [rows, season],
  );

  const dictionaryColumns = useMemo(() => {
    const entries = listDictionaryEntries().filter(
      (entry) => entry.entity === "player" && entry.domain === "statistics" && entry.visible,
    );
    return entries.filter((entry) => {
      const getter = PLAYER_STAT_GETTERS[entry.id];
      if (!getter) return false;
      return seasonRows.some((row) => getter(row) != null);
    });
  }, [seasonRows]);

  const playerClubYears = useMemo(() => {
    const key = new Set<string>();
    for (const row of ctx.data.data.players) {
      if (norm(row.name) !== norm(ctx.name) || !row.club_name) continue;
      key.add(`${row.season_year}|${row.club_name}`);
    }
    return key;
  }, [ctx.data.data.players, ctx.name]);

  const playerChallenges = useMemo(() => {
    const out: Array<{ name: string; club: string; years: number[]; bonus: number }> = [];
    const results = ctx.data.desafioResults ?? [];
    for (const result of results) {
      if (!result.desafio.bonus) continue;
      for (const match of result.matches) {
        if (match.subject !== "clubs") continue;
        const hasOverlap = match.years.some((year) =>
          playerClubYears.has(`${year}|${match.entity}`),
        );
        if (!hasOverlap) continue;
        out.push({
          name: result.desafio.name,
          club: match.entity,
          years: match.years,
          bonus: result.desafio.bonus,
        });
      }
    }
    return out.sort((a, b) => b.bonus - a.bonus || a.name.localeCompare(b.name, "pt-PT"));
  }, [ctx.data.desafioResults, playerClubYears]);

  const clubHistory = useMemo(() => {
    const key = new Set<string>();
    const history: Array<{
      season: number;
      club: string;
      country: string | null;
      competition: string | null;
    }> = [];
    for (const row of rows) {
      if (!row.club) continue;
      const id = `${row.season_year}|${row.club}|${row.competition}`;
      if (key.has(id)) continue;
      key.add(id);
      history.push({
        season: row.season_year,
        club: row.club,
        country: row.country,
        competition: row.competition,
      });
    }
    return history.sort((a, b) => b.season - a.season || a.club.localeCompare(b.club, "pt-PT"));
  }, [rows]);

  const uni = useMemo(() => {
    const idu = (ctx.profile as any)?.idu;
    return idu ? universe.getByIdu(idu) : universe.getByName(ctx.name);
  }, [universe, ctx.profile, ctx.name]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Estatísticas por época (Dictionary)</CardTitle>
            <ClubSeasonFilter years={years} value={season} onChange={setSeason} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">A carregar estatísticas...</p>
          ) : seasonRows.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">
              Sem estatísticas para a época selecionada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competição</TableHead>
                  <TableHead>Clube</TableHead>
                  {dictionaryColumns.map((entry) => (
                    <TableHead key={entry.id} className="text-right">
                      {entry.abbreviation || entry.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonRows.map((row, index) => (
                  <TableRow key={`${row.season_year}-${row.competition}-${row.club}-${index}`}>
                    <TableCell>
                      <Link
                        to="/competicoes/$name"
                        params={{ name: row.competition }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {row.competition}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.club ? (
                        <Link
                          to="/clubes/$name"
                          params={{ name: row.club }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {row.club}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {dictionaryColumns.map((entry) => {
                      const value = PLAYER_STAT_GETTERS[entry.id]?.(row);
                      return (
                        <TableCell key={entry.id} className="text-right tabular-nums">
                          {value == null ? "—" : fmtNum(value, 2)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de clubes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clubHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">
              Sem histórico de clubes disponível.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Competição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubHistory.map((item) => (
                  <TableRow key={`${item.season}-${item.club}-${item.competition ?? ""}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/clubes/$name"
                        params={{ name: item.club }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.club}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {(uni?.country ?? item.country) ? (
                        <Link
                          to="/paises/$name"
                          params={{ name: String(uni?.country ?? item.country) }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {uni?.country ?? item.country}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.competition ? (
                        <Link
                          to="/competicoes/$name"
                          params={{ name: item.competition }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {item.competition}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlayerAchievementsSection playerName={ctx.name} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desafios relacionados ao percurso</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {playerChallenges.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">
              Sem desafios aplicáveis ao histórico do jogador.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desafio</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>Épocas</TableHead>
                  <TableHead className="text-right">Bónus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerChallenges.map((item, index) => (
                  <TableRow key={`${item.name}-${item.club}-${index}`}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Link
                        to="/clubes/$name"
                        params={{ name: item.club }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.club}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.years.join(", ")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      +{fmtNum(item.bonus, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClubHistorySections({ ctx }: { ctx: ProfileContext }) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const standing of ctx.data.data.standings) {
      if (standing.club_name === ctx.name) set.add(standing.season_year);
    }
    return [...set].sort((a, b) => b - a);
  }, [ctx.data.data.standings, ctx.name]);

  const [season, setSeason] = useState<number | null>(years[0] ?? null);
  useEffect(() => {
    if (!years.length) {
      if (season !== null) setSeason(null);
      return;
    }
    if (season == null || !years.includes(season)) setSeason(years[0]);
  }, [years, season]);
  const current = season ?? years[0] ?? null;

  const coaches = useMemo(() => {
    const byKey = new Map<
      string,
      { season: number; coach: string; wins: number; games: number; titles: number }
    >();
    for (const row of ctx.data.data.coaches) {
      if (row.club_name !== ctx.name) continue;
      const key = `${row.season_year}|${row.name}`;
      if (!byKey.has(key)) {
        byKey.set(key, { season: row.season_year, coach: row.name, wins: 0, games: 0, titles: 0 });
      }
    }

    for (const entry of byKey.values()) {
      const standings = ctx.data.data.standings.filter(
        (s) => s.club_name === ctx.name && s.season_year === entry.season,
      );
      entry.games = standings.reduce((sum, s) => sum + (s.played ?? 0), 0);
      entry.wins = standings.reduce((sum, s) => sum + (s.wins ?? 0), 0);
      entry.titles += standings.filter((s) => s.is_champion).length;
      entry.titles += ctx.data.data.continental.filter(
        (c) => c.season_year === entry.season && c.winner === ctx.name,
      ).length;
      entry.titles += (ctx.data.data.international ?? []).filter(
        (c) => c.season_year === entry.season && c.winner === ctx.name,
      ).length;
    }

    return [...byKey.values()].sort(
      (a, b) => b.season - a.season || a.coach.localeCompare(b.coach, "pt-PT"),
    );
  }, [
    ctx.data.data.coaches,
    ctx.data.data.continental,
    ctx.data.data.international,
    ctx.data.data.standings,
    ctx.name,
  ]);

  const classifications = useMemo(() => {
    const rows: Array<{
      season: number;
      competition: string;
      module: string;
      position: string;
      result: string;
    }> = [];

    for (const s of ctx.data.data.standings) {
      if (s.club_name !== ctx.name) continue;
      rows.push({
        season: s.season_year,
        competition:
          s.competition ??
          s.division_label ??
          (s.module === "superleague" ? "Super League" : "Liga Nacional"),
        module: s.module === "superleague" ? "Super League" : "Liga",
        position: s.position != null ? String(s.position) : "—",
        result: s.is_champion ? "Campeão" : "Classificado",
      });
    }

    for (const c of ctx.data.data.continental) {
      if (c.team1 !== ctx.name && c.team2 !== ctx.name) continue;
      const finalist =
        c.winner === ctx.name ? (c.team1 === ctx.name ? c.team2 : c.team1) : c.winner;
      rows.push({
        season: c.season_year,
        competition: c.competition,
        module: "Continental",
        position: c.winner === ctx.name ? "1" : "2",
        result: c.winner === ctx.name ? "Vencedor" : `Finalista (${finalist ?? "—"})`,
      });
    }

    return rows.sort(
      (a, b) => b.season - a.season || a.competition.localeCompare(b.competition, "pt-PT"),
    );
  }, [ctx.data.data.continental, ctx.data.data.standings, ctx.name]);

  const titles = useMemo(() => {
    const rows: Array<{ season: number; competition: string }> = [];
    for (const s of ctx.data.data.standings) {
      if (s.club_name !== ctx.name || !s.is_champion) continue;
      rows.push({
        season: s.season_year,
        competition:
          s.competition ??
          s.division_label ??
          (s.module === "superleague" ? "Super League" : "Liga Nacional"),
      });
    }
    for (const c of ctx.data.data.continental) {
      if (c.winner !== ctx.name) continue;
      rows.push({ season: c.season_year, competition: c.competition });
    }
    return rows.sort(
      (a, b) => b.season - a.season || a.competition.localeCompare(b.competition, "pt-PT"),
    );
  }, [ctx.data.data.continental, ctx.data.data.standings, ctx.name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Plantel por época
        </h3>
        <ClubSeasonFilter years={years} value={current} onChange={setSeason} />
      </div>
      <ClubNewStatsSection clubName={ctx.name} season={current} />
      <ClubPlantelSection clubName={ctx.name} season={current} />
      <ClubReputationSection clubName={ctx.name} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Treinadores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem treinadores registados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Jogos</TableHead>
                  <TableHead className="text-right">Vitórias</TableHead>
                  <TableHead className="text-right">Títulos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((item) => (
                  <TableRow key={`${item.season}-${item.coach}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/treinadores/$name"
                        params={{ name: item.coach }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.coach}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.games}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.wins}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.titles}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classificações históricas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {classifications.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">
              Sem classificações históricas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Competição</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-right">Posição</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classifications.map((item, index) => (
                  <TableRow key={`${item.season}-${item.competition}-${index}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/competicoes/$name"
                        params={{ name: item.competition }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.competition}
                      </Link>
                    </TableCell>
                    <TableCell>{item.module}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.position}</TableCell>
                    <TableCell>{item.result}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conquistas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {titles.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem conquistas registadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Competição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.map((item, index) => (
                  <TableRow key={`${item.season}-${item.competition}-${index}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/competicoes/$name"
                        params={{ name: item.competition }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.competition}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DesafiosProfileCard results={ctx.data.desafioResults} subject="clubs" entity={ctx.name} />
    </div>
  );
}

export function CoachHistorySections({ ctx }: { ctx: ProfileContext }) {
  const assignments = useMemo(() => {
    return ctx.data.data.coaches
      .filter((row) => norm(row.name) === norm(ctx.name))
      .sort((a, b) => b.season_year - a.season_year);
  }, [ctx.data.data.coaches, ctx.name]);

  const clubsTrained = useMemo(() => {
    return assignments
      .filter((row) => row.club_name)
      .map((row) => ({
        season: row.season_year,
        club: row.club_name as string,
        country: row.club_name ? (ctx.data.data.clubCountry[row.club_name] ?? null) : null,
      }));
  }, [assignments, ctx.data.data.clubCountry]);

  const nationalTeams = useMemo(() => {
    return assignments
      .filter((row) => row.country_name || row.intl_role)
      .map((row) => ({
        season: row.season_year,
        country: row.country_name ?? row.nationality ?? "—",
        role: row.intl_role ?? "Selecionador",
      }));
  }, [assignments]);

  const achievements = useMemo(() => {
    const rows: Array<{ season: number; competition: string; club: string }> = [];
    for (const row of assignments) {
      if (!row.club_name) continue;
      for (const standing of ctx.data.data.standings) {
        if (
          standing.season_year !== row.season_year ||
          standing.club_name !== row.club_name ||
          !standing.is_champion
        )
          continue;
        rows.push({
          season: standing.season_year,
          competition:
            standing.competition ??
            standing.division_label ??
            (standing.module === "superleague" ? "Super League" : "Liga Nacional"),
          club: row.club_name,
        });
      }
      for (const continental of ctx.data.data.continental) {
        if (continental.season_year !== row.season_year || continental.winner !== row.club_name)
          continue;
        rows.push({
          season: continental.season_year,
          competition: continental.competition,
          club: row.club_name,
        });
      }
    }
    return rows.sort(
      (a, b) => b.season - a.season || a.competition.localeCompare(b.competition, "pt-PT"),
    );
  }, [assignments, ctx.data.data.continental, ctx.data.data.standings]);

  return (
    <div className="space-y-4">
      <CoachAttributesSection coachName={ctx.name} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clubes treinados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clubsTrained.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem clubes registados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>País</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubsTrained.map((item, index) => (
                  <TableRow key={`${item.season}-${item.club}-${index}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/clubes/$name"
                        params={{ name: item.club }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.club}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {item.country ? (
                        <Link
                          to="/paises/$name"
                          params={{ name: item.country }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {item.country}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleções</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {nationalTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem seleções registadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Seleção</TableHead>
                  <TableHead>Cargo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nationalTeams.map((item, index) => (
                  <TableRow key={`${item.season}-${item.country}-${index}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/paises/$name"
                        params={{ name: item.country }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.country}
                      </Link>
                    </TableCell>
                    <TableCell>{item.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conquistas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem conquistas registadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead>Competição</TableHead>
                  <TableHead>Clube</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {achievements.map((item, index) => (
                  <TableRow key={`${item.season}-${item.competition}-${item.club}-${index}`}>
                    <TableCell className="tabular-nums">{item.season}</TableCell>
                    <TableCell>
                      <Link
                        to="/competicoes/$name"
                        params={{ name: item.competition }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.competition}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/clubes/$name"
                        params={{ name: item.club }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.club}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DesafiosProfileCard results={ctx.data.desafioResults} subject="coaches" entity={ctx.name} />
    </div>
  );
}

function deriveCoachForClubSeason(
  ctx: ProfileContext,
  club: string,
  season: number,
): string | null {
  const coaches = ctx.data.data.coaches.filter(
    (row) => row.club_name === club && row.season_year === season,
  );
  if (!coaches.length) return null;
  return coaches[0]?.name ?? null;
}

export function CompetitionHistorySections({ ctx }: { ctx: ProfileContext }) {
  const { data: statsData } = usePlayerStatsData();

  const seasons = useMemo(() => {
    const set = new Set<number>();
    const comp = norm(ctx.name);
    for (const row of ctx.data.data.standings) {
      const name = canonicalCompetitionName(row);
      if (norm(name) === comp) set.add(row.season_year);
    }
    for (const row of ctx.data.data.continental) {
      if (norm(row.competition) === comp) set.add(row.season_year);
    }
    for (const row of ctx.data.data.international ?? []) {
      if (norm(row.competition) === comp) set.add(row.season_year);
    }
    return [...set].sort((a, b) => b - a);
  }, [ctx.data.data.continental, ctx.data.data.international, ctx.data.data.standings, ctx.name]);

  const [season, setSeason] = useState<number | null>(seasons[0] ?? null);

  useEffect(() => {
    if (!seasons.length) {
      if (season !== null) setSeason(null);
      return;
    }
    if (season == null || !seasons.includes(season)) setSeason(seasons[0]);
  }, [seasons, season]);

  const seasonRows = useMemo(() => {
    if (season == null)
      return [] as Array<{
        competition: string;
        winner: string | null;
        finalist: string | null;
        winnerCoach: string | null;
        finalistCoach: string | null;
      }>;
    const out: Array<{
      competition: string;
      winner: string | null;
      finalist: string | null;
      winnerCoach: string | null;
      finalistCoach: string | null;
    }> = [];
    const comp = norm(ctx.name);

    const standings = ctx.data.data.standings.filter((row) => {
      const name = canonicalCompetitionName(row);
      return row.season_year === season && norm(name) === comp;
    });

    if (standings.length) {
      const sorted = [...standings].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      const winner =
        sorted.find((row) => row.position === 1 || row.is_champion) ?? sorted[0] ?? null;
      const finalist = sorted.find((row) => row.position === 2) ?? null;
      const winnerCoach = winner?.club_name
        ? deriveCoachForClubSeason(ctx, winner.club_name, season)
        : null;
      const finalistCoach = finalist?.club_name
        ? deriveCoachForClubSeason(ctx, finalist.club_name, season)
        : null;
      const competitionName = winner?.competition ?? winner?.division_label ?? ctx.name;
      out.push({
        competition: competitionName,
        winner: winner?.club_name ?? null,
        finalist: finalist?.club_name ?? null,
        winnerCoach,
        finalistCoach,
      });
    }

    const continental = ctx.data.data.continental.filter(
      (row) => row.season_year === season && norm(row.competition) === comp,
    );
    for (const row of continental) {
      const finalist = row.winner === row.team1 ? row.team2 : row.team1;
      out.push({
        competition: row.competition,
        winner: row.winner,
        finalist,
        winnerCoach: row.winner ? deriveCoachForClubSeason(ctx, row.winner, row.season_year) : null,
        finalistCoach: finalist ? deriveCoachForClubSeason(ctx, finalist, row.season_year) : null,
      });
    }

    const international = (ctx.data.data.international ?? []).filter(
      (row) => row.season_year === season && norm(row.competition) === comp,
    );
    for (const row of international) {
      const finalist = row.winner === row.team1 ? row.team2 : row.team1;
      out.push({
        competition: row.competition,
        winner: row.winner,
        finalist,
        winnerCoach: row.winner === row.team1 ? row.coach1 : row.coach2,
        finalistCoach: row.winner === row.team1 ? row.coach2 : row.coach1,
      });
    }

    return out;
  }, [ctx, season]);

  const competitionAliases = useMemo(() => {
    const aliases = new Set<string>([norm(ctx.name)]);
    for (const row of seasonRows) aliases.add(norm(row.competition));
    if (season != null) {
      for (const row of ctx.data.data.standings) {
        if (row.season_year !== season) continue;
        const name = canonicalCompetitionName(row);
        if (!name) continue;
        if (norm(name) === norm(ctx.name)) aliases.add(norm(name));
      }
      for (const row of ctx.data.data.continental) {
        if (row.season_year === season && norm(row.competition) === norm(ctx.name)) {
          aliases.add(norm(row.competition));
        }
      }
      for (const row of ctx.data.data.international ?? []) {
        if (row.season_year === season && norm(row.competition) === norm(ctx.name)) {
          aliases.add(norm(row.competition));
        }
      }
    }
    return aliases;
  }, [ctx.data.data.continental, ctx.data.data.international, ctx.data.data.standings, ctx.name, season, seasonRows]);

  const topStats = useMemo(() => {
    if (!statsData || season == null) return null;
    const rows = statsData.players.filter(
      (row) => row.season_year === season && competitionAliases.has(norm(row.competition)),
    );
    if (!rows.length) return null;

    const byPlayer = new Map<
      string,
      { name: string; gls: number; ast: number; ratingTotal: number; ratingN: number }
    >();
    for (const row of rows) {
      const key = norm(row.player_name);
      const cur = byPlayer.get(key) ?? {
        name: row.player_name,
        gls: 0,
        ast: 0,
        ratingTotal: 0,
        ratingN: 0,
      };
      cur.gls += row.gls ?? 0;
      cur.ast += row.ast ?? 0;
      if (row.avg_rating != null) {
        cur.ratingTotal += row.avg_rating;
        cur.ratingN += 1;
      }
      byPlayer.set(key, cur);
    }

    const all = [...byPlayer.values()];
    const topScorer = [...all].sort((a, b) => b.gls - a.gls)[0] ?? null;
    const topAssist = [...all].sort((a, b) => b.ast - a.ast)[0] ?? null;
    const mvp =
      [...all].sort(
        (a, b) =>
          (b.ratingN ? b.ratingTotal / b.ratingN : 0) - (a.ratingN ? a.ratingTotal / a.ratingN : 0),
      )[0] ?? null;
    return { topScorer, topAssist, mvp };
  }, [statsData, season, competitionAliases]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Todas as épocas</CardTitle>
            <ClubSeasonFilter years={seasons} value={season} onChange={setSeason} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {seasonRows.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">
              Sem resultados para a época selecionada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competição</TableHead>
                  <TableHead>Vencedor</TableHead>
                  <TableHead>Finalista</TableHead>
                  <TableHead>Treinador vencedor</TableHead>
                  <TableHead>Treinador finalista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonRows.map((item, index) => (
                  <TableRow key={`${item.competition}-${item.winner}-${item.finalist}-${index}`}>
                    <TableCell>{item.competition}</TableCell>
                    <TableCell>
                      {item.winner ? (
                        <Link
                          to="/clubes/$name"
                          params={{ name: item.winner }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {item.winner}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.finalist ? (
                        <Link
                          to="/clubes/$name"
                          params={{ name: item.finalist }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {item.finalist}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.winnerCoach ? (
                        <Link
                          to="/treinadores/$name"
                          params={{ name: item.winnerCoach }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {item.winnerCoach}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.finalistCoach ? (
                        <Link
                          to="/treinadores/$name"
                          params={{ name: item.finalistCoach }}
                          className="hover:text-primary hover:underline"
                          search={{ tab: undefined }}
                        >
                          {item.finalistCoach}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CompetitionNewStatsSection competition={ctx.name} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas da época</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!topStats ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">
              Sem dados de melhor marcador, melhor assistente ou MVP para esta época.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Melhor marcador</TableCell>
                  <TableCell>
                    {topStats.topScorer ? (
                      <Link
                        to="/jogadores/$name"
                        params={{ name: topStats.topScorer.name }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {topStats.topScorer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {topStats.topScorer ? fmtNum(topStats.topScorer.gls, 0) : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Melhor assistente</TableCell>
                  <TableCell>
                    {topStats.topAssist ? (
                      <Link
                        to="/jogadores/$name"
                        params={{ name: topStats.topAssist.name }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {topStats.topAssist.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {topStats.topAssist ? fmtNum(topStats.topAssist.ast, 0) : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>MVP</TableCell>
                  <TableCell>
                    {topStats.mvp ? (
                      <Link
                        to="/jogadores/$name"
                        params={{ name: topStats.mvp.name }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {topStats.mvp.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {topStats.mvp && topStats.mvp.ratingN
                      ? fmtNum(topStats.mvp.ratingTotal / topStats.mvp.ratingN, 2)
                      : "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CompetitionRecordsSection competition={ctx.name} />
    </div>
  );
}

export function CountryHistorySections({ ctx }: { ctx: ProfileContext }) {
  const { data: statsData } = usePlayerStatsData();

  const evolution = useMemo(() => {
    const years = seasonList([
      ...ctx.data.ranks.years,
      ...ctx.data.data.standings.map((row) => row.season_year),
      ...ctx.data.data.coaches.map((row) => row.season_year),
    ]);

    const rows = years.map((year) => {
      const rankMap = ctx.data.ranks.evolution.countries;
      const countries = Object.keys(rankMap)
        .map((name) => ({ name, score: rankMap[name]?.[year] ?? 0 }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
      const rank = countries.findIndex((item) => norm(item.name) === norm(ctx.name));

      const clubs = new Set(
        ctx.data.data.standings
          .filter(
            (s) =>
              s.season_year === year &&
              norm(ctx.data.data.clubCountry[s.club_name]) === norm(ctx.name),
          )
          .map((s) => s.club_name),
      );

      const players = new Set(
        (statsData?.players ?? [])
          .filter((p) => p.season_year === year && norm(p.nationality) === norm(ctx.name))
          .map((p) => p.player_name),
      );

      const coaches = new Set(
        ctx.data.data.coaches
          .filter((c) => c.season_year === year && norm(c.nationality) === norm(ctx.name))
          .map((c) => c.name),
      );

      return {
        year,
        rank: rank >= 0 ? rank + 1 : null,
        clubs: clubs.size,
        players: players.size,
        coaches: coaches.size,
      };
    });

    return rows;
  }, [
    ctx.data.data.clubCountry,
    ctx.data.data.coaches,
    ctx.data.data.standings,
    ctx.data.ranks.evolution.countries,
    ctx.data.ranks.years,
    ctx.name,
    statsData?.players,
  ]);

  const clubs = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const row of ctx.data.data.standings) {
      const country = ctx.data.data.clubCountry[row.club_name];
      if (norm(country) !== norm(ctx.name)) continue;
      const years = map.get(row.club_name) ?? [];
      years.push(row.season_year);
      map.set(row.club_name, years);
    }
    return [...map.entries()]
      .map(([club, years]) => {
        const unique = seasonList(years);
        return {
          club,
          firstSeason: unique[unique.length - 1],
          lastSeason: unique[0],
          seasons: unique.length,
        };
      })
      .sort((a, b) => b.lastSeason - a.lastSeason || a.club.localeCompare(b.club, "pt-PT"));
  }, [ctx.data.data.clubCountry, ctx.data.data.standings, ctx.name]);

  const players = useMemo(() => {
    const map = new Map<string, { seasons: Set<number>; clubs: Set<string> }>();
    for (const row of statsData?.players ?? []) {
      if (norm(row.nationality) !== norm(ctx.name)) continue;
      const cur = map.get(row.player_name) ?? {
        seasons: new Set<number>(),
        clubs: new Set<string>(),
      };
      cur.seasons.add(row.season_year);
      if (row.club) cur.clubs.add(row.club);
      map.set(row.player_name, cur);
    }
    return [...map.entries()]
      .map(([name, meta]) => ({ name, seasons: meta.seasons.size, clubs: meta.clubs.size }))
      .sort((a, b) => b.seasons - a.seasons || a.name.localeCompare(b.name, "pt-PT"));
  }, [statsData?.players, ctx.name]);

  const coaches = useMemo(() => {
    const map = new Map<string, { seasons: Set<number>; clubs: Set<string> }>();
    for (const row of ctx.data.data.coaches) {
      if (norm(row.nationality) !== norm(ctx.name)) continue;
      const cur = map.get(row.name) ?? { seasons: new Set<number>(), clubs: new Set<string>() };
      cur.seasons.add(row.season_year);
      if (row.club_name) cur.clubs.add(row.club_name);
      map.set(row.name, cur);
    }
    return [...map.entries()]
      .map(([name, meta]) => ({ name, seasons: meta.seasons.size, clubs: meta.clubs.size }))
      .sort((a, b) => b.seasons - a.seasons || a.name.localeCompare(b.name, "pt-PT"));
  }, [ctx.data.data.coaches, ctx.name]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução por época</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {evolution.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem evolução disponível.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead className="text-right">Ranking</TableHead>
                  <TableHead className="text-right">N.º Clubes</TableHead>
                  <TableHead className="text-right">N.º Jogadores</TableHead>
                  <TableHead className="text-right">N.º Treinadores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evolution.map((item) => (
                  <TableRow key={item.year}>
                    <TableCell className="tabular-nums">{item.year}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.rank != null ? `#${item.rank}` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.clubs}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.players}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.coaches}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clubes do país</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clubs.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem clubes registados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clube</TableHead>
                  <TableHead className="text-right">Primeira época</TableHead>
                  <TableHead className="text-right">Última época</TableHead>
                  <TableHead className="text-right">Épocas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((item) => (
                  <TableRow key={item.club}>
                    <TableCell>
                      <Link
                        to="/clubes/$name"
                        params={{ name: item.club }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.club}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.firstSeason}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.lastSeason}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.seasons}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jogadores do país</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem jogadores registados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Épocas</TableHead>
                  <TableHead className="text-right">Clubes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>
                      <Link
                        to="/jogadores/$name"
                        params={{ name: item.name }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.seasons}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.clubs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Treinadores do país</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Sem treinadores registados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinador</TableHead>
                  <TableHead className="text-right">Épocas</TableHead>
                  <TableHead className="text-right">Clubes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>
                      <Link
                        to="/treinadores/$name"
                        params={{ name: item.name }}
                        className="hover:text-primary hover:underline"
                        search={{ tab: undefined }}
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.seasons}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.clubs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DesafiosProfileCard
        results={ctx.data.desafioResults}
        subject="countries"
        entity={ctx.name}
      />
    </div>
  );
}
