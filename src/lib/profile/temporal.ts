import {
  listDictionaryEntries,
  resolveDictionaryColumn,
  type DictionaryEntry,
} from "@/lib/dictionary";
import type { CompetitionStatRow, PlayerStatRow } from "@/lib/fm-player-stats-db";
import type { ProfileContext, ProfileEntityKind } from "./types";

export interface TemporalPoint {
  season: number;
  value: number;
}

export interface TemporalMetric {
  key: string;
  label: string;
  entry: DictionaryEntry;
  points: TemporalPoint[];
}

type SeasonAccumulator = Map<number, Map<string, { sum: number; count: number }>>;

const DENY_KEYS = new Set([
  "id",
  "season_year",
  "comp_type",
  "competition",
  "country",
  "continent",
  "player_name",
  "idu",
  "nationality",
  "club",
  "league",
  "name",
  "module",
  "club_name",
  "division_num",
  "division_label",
  "position",
  "is_champion",
  "info",
  "coach1",
  "coach2",
  "winner",
]);

function norm(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function tokenVariants(value: string): string[] {
  const base = norm(value);
  if (!base) return [];
  const out = new Set<string>([base]);
  if (base.endsWith("s") && base.length > 3) out.add(base.slice(0, -1));
  return [...out];
}

function scoreMatch(key: string, entry: DictionaryEntry): number {
  const candidates = new Set<string>();
  const leaf = entry.id.split(".").at(-1);
  for (const item of [entry.key, entry.name, entry.abbreviation, leaf, ...entry.aliases]) {
    for (const variant of tokenVariants(String(item ?? ""))) candidates.add(variant);
  }
  let best = 0;
  for (const keyVariant of tokenVariants(key)) {
    for (const token of candidates) {
      if (!token) continue;
      if (keyVariant === token) best = Math.max(best, 100);
      else if (keyVariant.includes(token) && token.length >= 4) best = Math.max(best, 80);
      else if (token.includes(keyVariant) && keyVariant.length >= 4) best = Math.max(best, 70);
    }
  }
  return best;
}

function resolveEntryForColumn(
  key: string,
  entries: DictionaryEntry[],
  entity: ProfileEntityKind,
): DictionaryEntry | null {
  const acceptsEntity = (entry: DictionaryEntry): boolean => {
    if (entry.entity === entity) return true;
    if (entity === "country")
      return ["club", "coach", "player", "competition"].includes(entry.entity);
    if (entity === "club") return ["club", "player"].includes(entry.entity);
    if (entity === "competition") return ["competition", "club", "player"].includes(entry.entity);
    if (entity === "coach") return ["coach", "club"].includes(entry.entity);
    return false;
  };

  const direct = resolveDictionaryColumn(key);
  if (direct && acceptsEntity(direct)) {
    return direct;
  }

  const candidates = entries.filter((entry) => acceptsEntity(entry));

  let best: DictionaryEntry | null = null;
  let bestScore = 0;
  for (const entry of candidates) {
    const score = scoreMatch(key, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 70 ? best : null;
}

function isNumeric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function aggregateMode(entry: DictionaryEntry): "sum" | "avg" {
  if (entry.unit === "%") return "avg";
  if (
    entry.category === "rating" ||
    entry.category === "profile_field" ||
    entry.category === "attribute"
  )
    return "avg";
  return "sum";
}

function bump(acc: SeasonAccumulator, season: number, key: string, value: number) {
  const seasonMap = acc.get(season) ?? new Map<string, { sum: number; count: number }>();
  const slot = seasonMap.get(key) ?? { sum: 0, count: 0 };
  slot.sum += value;
  slot.count += 1;
  seasonMap.set(key, slot);
  acc.set(season, seasonMap);
}

function addNumericFields(acc: SeasonAccumulator, season: number, row: Record<string, unknown>) {
  for (const [key, value] of Object.entries(row)) {
    if (DENY_KEYS.has(key)) continue;
    if (!isNumeric(value)) continue;
    bump(acc, season, key, value);
  }
}

function addRankSeries(acc: SeasonAccumulator, ctx: ProfileContext) {
  const map =
    ctx.kind === "club"
      ? ctx.data.ranks.evolution.clubs
      : ctx.kind === "coach"
        ? ctx.data.ranks.evolution.coaches
        : ctx.kind === "country"
          ? ctx.data.ranks.evolution.countries
          : null;
  if (!map) return;
  const own =
    map[ctx.name] ??
    Object.entries(map).find(([name]) => norm(name) === norm(ctx.name))?.[1];
  if (!own) return;
  for (const [year, value] of Object.entries(own)) {
    const season = Number(year);
    if (!Number.isFinite(season) || !Number.isFinite(value)) continue;
    bump(acc, season, "ranking", Number(value));
  }
}

function addProfilePlayerHistory(acc: SeasonAccumulator, ctx: ProfileContext) {
  if (ctx.kind !== "player") return;
  const profile = ctx.profile as
    | {
        history?: Array<{
          year: number;
          age?: number | null;
          gls?: number;
          ast?: number;
          ca?: number;
          cp?: number;
          ra?: number;
          rm?: number;
          salary?: number;
          vp?: number;
        }>;
      }
    | null;
  const history = profile?.history ?? [];
  for (const point of history) {
    const season = Number(point.year);
    if (!Number.isFinite(season)) continue;
    const payload: Record<string, unknown> = {
      age: point.age ?? null,
      gls: point.gls ?? null,
      ast: point.ast ?? null,
      ca: point.ca ?? null,
      cp: point.cp ?? null,
      ra: point.ra ?? null,
      rm: point.rm ?? null,
      salary: point.salary ?? null,
      vp: point.vp ?? null,
    };
    addNumericFields(acc, season, payload);
  }
}

function addProfileClubHistory(acc: SeasonAccumulator, ctx: ProfileContext) {
  if (ctx.kind !== "club") return;
  const profile = ctx.profile as
    | {
        chart?: Array<{ year: number; weighted?: number; raw?: number; positionWeighted?: number | null }>;
      }
    | null;
  const chart = profile?.chart ?? [];
  for (const point of chart) {
    const season = Number(point.year);
    if (!Number.isFinite(season)) continue;
    addNumericFields(acc, season, {
      ranking_weighted_score: point.weighted ?? null,
      ranking_raw_score: point.raw ?? null,
      ranking_position: point.positionWeighted ?? null,
    });
  }
}

function addLegacyPlayerRows(acc: SeasonAccumulator, ctx: ProfileContext) {
  if (ctx.kind !== "player" && ctx.kind !== "club") return;

  if (ctx.kind === "player") {
    for (const row of ctx.data.data.players.filter((r) => norm(r.name) === norm(ctx.name))) {
      addNumericFields(acc, row.season_year, row as unknown as Record<string, unknown>);
    }
    return;
  }

  for (const row of ctx.data.data.players.filter((r) => norm(r.club_name) === norm(ctx.name))) {
    addNumericFields(acc, row.season_year, row as unknown as Record<string, unknown>);
  }
}

function buildCoachRows(ctx: ProfileContext): SeasonAccumulator {
  const acc: SeasonAccumulator = new Map();
  const coachRows = ctx.data.data.coaches.filter((row) => norm(row.name) === norm(ctx.name));
  const bySeasonClub = new Set<string>();
  for (const row of coachRows) {
    if (!row.club_name) continue;
    const key = `${row.season_year}|${row.club_name}`;
    if (bySeasonClub.has(key)) continue;
    bySeasonClub.add(key);

    const standings = ctx.data.data.standings.filter(
      (standing) =>
        standing.season_year === row.season_year && standing.club_name === row.club_name,
    );
    const games = standings.reduce((sum, standing) => sum + Number(standing.played ?? 0), 0);
    const wins = standings.reduce((sum, standing) => sum + Number(standing.wins ?? 0), 0);
    const draws = standings.reduce((sum, standing) => sum + Number(standing.draws ?? 0), 0);
    const losses = standings.reduce((sum, standing) => sum + Number(standing.losses ?? 0), 0);
    const points = standings.reduce((sum, standing) => sum + Number(standing.points ?? 0), 0);
    const gf = standings.reduce((sum, standing) => sum + Number(standing.gf ?? 0), 0);
    const ga = standings.reduce((sum, standing) => sum + Number(standing.ga ?? 0), 0);

    const titles =
      standings.filter((standing) => standing.is_champion).length +
      ctx.data.data.continental.filter(
        (c) => c.season_year === row.season_year && c.winner === row.club_name,
      ).length +
      (ctx.data.data.international ?? []).filter(
        (c) => c.season_year === row.season_year && c.winner === row.club_name,
      ).length;

    const winPct = games > 0 ? (wins / games) * 100 : 0;

    const payload: Record<string, number> = {
      jogos: games,
      vitorias: wins,
      empates: draws,
      derrotas: losses,
      pontos: points,
      golos: gf,
      golos_sofridos: ga,
      titulos: titles,
      percentagem_vitorias: winPct,
    };
    addNumericFields(acc, row.season_year, payload);
  }
  return acc;
}

function buildCountryRows(ctx: ProfileContext, playerRows: PlayerStatRow[]): SeasonAccumulator {
  const acc: SeasonAccumulator = new Map();
  const years = new Set<number>([
    ...ctx.data.ranks.years,
    ...ctx.data.data.standings.map((row) => row.season_year),
    ...ctx.data.data.coaches.map((row) => row.season_year),
    ...playerRows.map((row) => row.season_year),
  ]);

  for (const season of [...years]) {
    const clubs = new Set(
      ctx.data.data.standings
        .filter(
          (row) =>
            row.season_year === season &&
            norm(ctx.data.data.clubCountry[row.club_name]) === norm(ctx.name),
        )
        .map((row) => row.club_name),
    );
    const players = new Set(
      playerRows
        .filter((row) => row.season_year === season && norm(row.nationality) === norm(ctx.name))
        .map((row) => row.player_name),
    );
    const coaches = new Set(
      ctx.data.data.coaches
        .filter((row) => row.season_year === season && norm(row.nationality) === norm(ctx.name))
        .map((row) => row.name),
    );

    const payload: Record<string, number> = {
      numero_clubes: clubs.size,
      numero_jogadores: players.size,
      numero_treinadores: coaches.size,
    };
    addNumericFields(acc, season, payload);
  }
  return acc;
}

function buildCompetitionRows(
  ctx: ProfileContext,
  playerRows: PlayerStatRow[],
  competitionRows: CompetitionStatRow[],
): SeasonAccumulator {
  const acc: SeasonAccumulator = new Map();
  const comp = norm(ctx.name);

  for (const row of playerRows.filter((item) => norm(item.competition) === comp)) {
    addNumericFields(acc, row.season_year, row as unknown as Record<string, unknown>);
  }

  for (const row of competitionRows.filter((item) => norm(item.competition) === comp)) {
    addNumericFields(acc, row.season_year, row as unknown as Record<string, unknown>);
  }

  const bySeason = new Map<
    number,
    { clubs: Set<string>; points: number; games: number; goals: number }
  >();
  for (const standing of ctx.data.data.standings) {
    const name =
      standing.competition ??
      standing.division_label ??
      (standing.module === "superleague" && standing.division_num != null
        ? `Div. ${standing.division_num}`
        : "");
    if (norm(name) !== comp) continue;
    const slot = bySeason.get(standing.season_year) ?? {
      clubs: new Set<string>(),
      points: 0,
      games: 0,
      goals: 0,
    };
    slot.clubs.add(standing.club_name);
    slot.points += Number(standing.points ?? 0);
    slot.games += Number(standing.played ?? 0);
    slot.goals += Number(standing.gf ?? 0);
    bySeason.set(standing.season_year, slot);
  }

  for (const [season, row] of bySeason) {
    addNumericFields(acc, season, {
      numero_clubes: row.clubs.size,
      pontos: row.points,
      jogos: row.games,
      golos: row.goals,
    });
  }

  return acc;
}

export function buildTemporalMetrics(
  ctx: ProfileContext,
  options: { playerRows: PlayerStatRow[]; competitionRows: CompetitionStatRow[] },
): TemporalMetric[] {
  const entries = listDictionaryEntries().filter(
    (entry) => entry.visible && entry.dataType === "number",
  );

  let acc: SeasonAccumulator = new Map();
  if (ctx.kind === "player") {
    const rows = options.playerRows.filter((row) => norm(row.player_name) === norm(ctx.name));
    for (const row of rows)
      addNumericFields(acc, row.season_year, row as unknown as Record<string, unknown>);
    addLegacyPlayerRows(acc, ctx);
    addProfilePlayerHistory(acc, ctx);
  } else if (ctx.kind === "club") {
    const rows = options.playerRows.filter((row) => norm(row.club) === norm(ctx.name));
    for (const row of rows)
      addNumericFields(acc, row.season_year, row as unknown as Record<string, unknown>);

    for (const standing of ctx.data.data.standings.filter((row) => norm(row.club_name) === norm(ctx.name))) {
      addNumericFields(acc, standing.season_year, standing as unknown as Record<string, unknown>);
    }
    addLegacyPlayerRows(acc, ctx);
    addProfileClubHistory(acc, ctx);
  } else if (ctx.kind === "coach") {
    acc = buildCoachRows(ctx);
  } else if (ctx.kind === "competition") {
    acc = buildCompetitionRows(ctx, options.playerRows, options.competitionRows);
  } else {
    acc = buildCountryRows(ctx, options.playerRows);
  }

  addRankSeries(acc, ctx);

  const byMetric = new Map<string, { entry: DictionaryEntry; points: TemporalPoint[] }>();
  const seasons = [...acc.keys()].sort((a, b) => a - b);

  for (const season of seasons) {
    const seasonMap = acc.get(season);
    if (!seasonMap) continue;

    for (const [key, slot] of seasonMap.entries()) {
      const entry = resolveEntryForColumn(key, entries, ctx.kind);
      if (!entry) continue;

      const mode = aggregateMode(entry);
      const value = mode === "avg" ? (slot.count ? slot.sum / slot.count : 0) : slot.sum;
      if (!Number.isFinite(value)) continue;

      const metric = byMetric.get(entry.id) ?? { entry, points: [] };
      metric.points.push({ season, value });
      byMetric.set(entry.id, metric);
    }
  }

  return [...byMetric.values()]
    .filter((item) => item.points.length > 0)
    .map((item) => ({
      key: item.entry.id,
      label: item.entry.abbreviation || item.entry.name,
      entry: item.entry,
      points: item.points.sort((a, b) => a.season - b.season),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
}
