import type { PlayerStatRow } from "@/lib/fm-player-stats-db";
import type { RankingsPayload, ProfileContext } from "@/lib/profile/types";
import { getClubAliasMap } from "@/lib/fm-club-map";

export const STYLE_CONCEPTS = [
  "possession",
  "buildUp",
  "shortPassing",
  "longPassing",
  "progression",
  "pressing",
  "recovery",
  "counterAttack",
  "transitions",
  "crossing",
  "interiorPlay",
  "widePlay",
  "finishing",
  "creativity",
  "defensiveIntensity",
  "discipline",
] as const;

export type StyleConcept = (typeof STYLE_CONCEPTS)[number];

export interface StyleVector {
  possession: number;
  buildUp: number;
  shortPassing: number;
  longPassing: number;
  progression: number;
  pressing: number;
  recovery: number;
  counterAttack: number;
  transitions: number;
  crossing: number;
  interiorPlay: number;
  widePlay: number;
  finishing: number;
  creativity: number;
  defensiveIntensity: number;
  discipline: number;
}

export interface StyleIndicator {
  label: string;
  value: number;
}

export interface StyleAnalysis {
  entity: string;
  season: number;
  sampleSize: number;
  vector: StyleVector;
  strengths: string[];
  weaknesses: string[];
  offensive: StyleIndicator[];
  defensive: StyleIndicator[];
  build: StyleIndicator[];
  traits: string[];
  summary: string;
}

export interface StyleSimilarity {
  name: string;
  similarity: number;
}

export interface StyleComparisonResult {
  items: StyleSimilarity[];
}

interface FeatureSet {
  passPct: number;
  tackles90: number;
  fouls90: number;
  shotPct: number;
  xgGame: number;
  goalsGame: number;
  assistsGame: number;
  cardsGame: number;
  rating: number;
}

interface RawAggregate {
  rows: PlayerStatRow[];
  sampleSize: number;
  features: FeatureSet;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function meanBy(
  rows: PlayerStatRow[],
  getter: (row: PlayerStatRow) => number | null | undefined,
): number {
  const values = rows
    .map((row) => getter(row) ?? null)
    .filter((value): value is number => value != null && Number.isFinite(value));
  return avg(values);
}

function totalBy(
  rows: PlayerStatRow[],
  getter: (row: PlayerStatRow) => number | null | undefined,
): number {
  return rows.reduce((sum, row) => sum + (getter(row) ?? 0), 0);
}

function safeDivide(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0;
  return a / b;
}

function weighted(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 0;
  const total = values.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
  return total / totalWeight;
}

function asScore(value01: number): number {
  return Math.round(clamp01(value01) * 100);
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function canonicalClub(value: string | null | undefined, aliases: Record<string, string>): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return normalizeName(aliases[raw] ?? raw);
}

function profileIdu(ctx: ProfileContext): string | null {
  const value = (ctx.profile as any)?.idu;
  return value == null ? null : String(value);
}

function isPlayerMatch(row: PlayerStatRow, ctx: ProfileContext, entityName: string): boolean {
  const targetName = normalizeName(entityName);
  const rowName = normalizeName(row.player_name);
  if (rowName === targetName) return true;
  const idu = profileIdu(ctx);
  if (!idu) return false;
  return (row.idu ?? "") === idu;
}

function competitionLabelFromStanding(row: RankingsPayload["data"]["standings"][number]): string {
  if (row.competition) return row.competition;
  if (row.division_label) return row.division_label;
  if (row.module === "superleague" && row.division_num != null) return `Div. ${row.division_num}`;
  return "";
}

function aggregateRows(rows: PlayerStatRow[]): RawAggregate {
  const sampleSize = rows.length;
  const games = totalBy(rows, (row) => row.games ?? 0);
  const goals = totalBy(rows, (row) => row.gls ?? 0);
  const assists = totalBy(rows, (row) => row.ast ?? 0);
  const cards = totalBy(rows, (row) => (row.yellows ?? 0) + (row.reds ?? 0) * 1.5);

  const features: FeatureSet = {
    passPct: meanBy(rows, (row) => row.pass_pct ?? null),
    tackles90: meanBy(rows, (row) => row.tackles_per90 ?? null),
    fouls90: meanBy(rows, (row) => row.fouls_per90 ?? null),
    shotPct: meanBy(rows, (row) => row.shot_pct ?? null),
    xgGame: safeDivide(
      totalBy(rows, (row) => row.xg ?? 0),
      Math.max(sampleSize, 1),
    ),
    goalsGame: safeDivide(goals, Math.max(games, 1)),
    assistsGame: safeDivide(assists, Math.max(games, 1)),
    cardsGame: safeDivide(cards, Math.max(games, 1)),
    rating: meanBy(rows, (row) => row.avg_rating ?? null),
  };

  return { rows, sampleSize, features };
}

function vectorFromFeatures(features: FeatureSet): StyleVector {
  const pass = normRange(features.passPct, 50, 95);
  const tackles = normRange(features.tackles90, 0.5, 6);
  const fouls = normRange(features.fouls90, 0.2, 4.2);
  const shot = normRange(features.shotPct, 20, 80);
  const xg = normRange(features.xgGame, 0.05, 1.4);
  const goals = normRange(features.goalsGame, 0.05, 1.2);
  const assists = normRange(features.assistsGame, 0.02, 0.9);
  const cards = normRange(features.cardsGame, 0.02, 1.1);
  const rating = normRange(features.rating, 6.2, 7.8);

  const possession = asScore(
    weighted([
      { value: pass, weight: 0.8 },
      { value: rating, weight: 0.2 },
    ]),
  );
  const buildUp = asScore(
    weighted([
      { value: pass, weight: 0.55 },
      { value: assists, weight: 0.25 },
      { value: xg, weight: 0.2 },
    ]),
  );
  const shortPassing = asScore(
    weighted([
      { value: pass, weight: 0.85 },
      { value: assists, weight: 0.15 },
    ]),
  );
  const longPassing = asScore(
    weighted([
      { value: 1 - pass, weight: 0.55 },
      { value: xg, weight: 0.2 },
      { value: shot, weight: 0.25 },
    ]),
  );
  const progression = asScore(
    weighted([
      { value: xg, weight: 0.35 },
      { value: assists, weight: 0.3 },
      { value: goals, weight: 0.35 },
    ]),
  );
  const pressing = asScore(
    weighted([
      { value: tackles, weight: 0.65 },
      { value: fouls, weight: 0.35 },
    ]),
  );
  const recovery = asScore(
    weighted([
      { value: tackles, weight: 0.8 },
      { value: pass, weight: 0.2 },
    ]),
  );
  const counterAttack = asScore(
    weighted([
      { value: 1 - pass, weight: 0.45 },
      { value: goals, weight: 0.35 },
      { value: shot, weight: 0.2 },
    ]),
  );
  const transitions = asScore(
    weighted([
      { value: goals, weight: 0.4 },
      { value: assists, weight: 0.35 },
      { value: 1 - pass, weight: 0.25 },
    ]),
  );
  const crossing = asScore(
    weighted([
      { value: 1 - pass, weight: 0.4 },
      { value: assists, weight: 0.3 },
      { value: shot, weight: 0.3 },
    ]),
  );
  const interiorPlay = asScore(
    weighted([
      { value: xg, weight: 0.45 },
      { value: pass, weight: 0.3 },
      { value: assists, weight: 0.25 },
    ]),
  );
  const widePlay = asScore(
    weighted([
      { value: crossing / 100, weight: 0.6 },
      { value: 1 - pass, weight: 0.4 },
    ]),
  );
  const finishing = asScore(
    weighted([
      { value: goals, weight: 0.55 },
      { value: shot, weight: 0.35 },
      { value: xg, weight: 0.1 },
    ]),
  );
  const creativity = asScore(
    weighted([
      { value: assists, weight: 0.45 },
      { value: pass, weight: 0.35 },
      { value: xg, weight: 0.2 },
    ]),
  );
  const defensiveIntensity = asScore(
    weighted([
      { value: tackles, weight: 0.6 },
      { value: fouls, weight: 0.25 },
      { value: cards, weight: 0.15 },
    ]),
  );
  const discipline = asScore(
    weighted([
      { value: 1 - cards, weight: 0.55 },
      { value: 1 - fouls, weight: 0.45 },
    ]),
  );

  return {
    possession,
    buildUp,
    shortPassing,
    longPassing,
    progression,
    pressing,
    recovery,
    counterAttack,
    transitions,
    crossing,
    interiorPlay,
    widePlay,
    finishing,
    creativity,
    defensiveIntensity,
    discipline,
  };
}

function styleLabel(concept: StyleConcept): string {
  switch (concept) {
    case "possession":
      return "Posse";
    case "buildUp":
      return "Construção";
    case "shortPassing":
      return "Passe Curto";
    case "longPassing":
      return "Passe Longo";
    case "progression":
      return "Progressão";
    case "pressing":
      return "Pressão";
    case "recovery":
      return "Recuperação";
    case "counterAttack":
      return "Contra-Ataque";
    case "transitions":
      return "Transições";
    case "crossing":
      return "Cruzamentos";
    case "interiorPlay":
      return "Jogo Interior";
    case "widePlay":
      return "Jogo Exterior";
    case "finishing":
      return "Finalização";
    case "creativity":
      return "Criatividade";
    case "defensiveIntensity":
      return "Intensidade Defensiva";
    case "discipline":
      return "Disciplina";
    default:
      return concept;
  }
}

function topConcepts(vector: StyleVector): StyleConcept[] {
  return [...STYLE_CONCEPTS].sort((a, b) => vector[b] - vector[a]).slice(0, 4);
}

function lowConcepts(vector: StyleVector): StyleConcept[] {
  return [...STYLE_CONCEPTS].sort((a, b) => vector[a] - vector[b]).slice(0, 4);
}

function detectTraits(vector: StyleVector): string[] {
  const traits: string[] = [];
  if (vector.possession >= 70 && vector.shortPassing >= 70) traits.push("Futebol de Posse");
  if (vector.longPassing >= 65 && vector.counterAttack >= 65) traits.push("Futebol Direto");
  if (vector.pressing >= 68 && vector.defensiveIntensity >= 66) traits.push("Pressão Alta");
  if (vector.pressing <= 40 && vector.discipline >= 60) traits.push("Bloco Baixo");
  if (vector.counterAttack >= 65 && vector.transitions >= 65) traits.push("Contra-Ataque");
  if (vector.shortPassing >= 72) traits.push("Construção Curta");
  if (vector.crossing >= 65 && vector.widePlay >= 65) traits.push("Cruzamentos Frequentes");
  if (vector.interiorPlay >= 65) traits.push("Jogo Interior");
  if (vector.widePlay >= 65) traits.push("Jogo Exterior");
  return [...new Set(traits)];
}

function buildSummary(entityLabel: string, vector: StyleVector): string {
  const strongest = topConcepts(vector).slice(0, 3).map(styleLabel);
  const weakest = lowConcepts(vector).slice(0, 2).map(styleLabel);
  return (
    `${entityLabel} evidencia ${strongest.join(", ")} como pilares do modelo de jogo. ` +
    `As componentes com menor expressão são ${weakest.join(" e ")}.`
  );
}

function indicators(vector: StyleVector, keys: StyleConcept[]): StyleIndicator[] {
  return keys.map((key) => ({ label: styleLabel(key), value: vector[key] }));
}

function toArray(vector: StyleVector): number[] {
  return STYLE_CONCEPTS.map((concept) => vector[concept]);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA <= 0 || magB <= 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function playersForEntity(
  kind: ProfileContext["kind"],
  entityName: string,
  season: number,
  data: RankingsPayload,
  playerRows: PlayerStatRow[],
  ctx?: ProfileContext,
): PlayerStatRow[] {
  const normEntity = normalizeName(entityName);
  const aliases = getClubAliasMap();

  if (kind === "player") {
    return playerRows.filter((row) => {
      if (row.season_year !== season) return false;
      if (ctx && isPlayerMatch(row, ctx, entityName)) return true;
      return normalizeName(row.player_name) === normEntity;
    });
  }

  if (kind === "club") {
    return playerRows.filter(
      (row) => row.season_year === season && canonicalClub(row.club, aliases) === canonicalClub(entityName, aliases),
    );
  }

  if (kind === "coach") {
    const coachedClubs = new Set(
      data.data.coaches
        .filter(
          (row) =>
            row.season_year === season && normalizeName(row.name) === normEntity && row.club_name,
        )
        .map((row) => normalizeName(row.club_name)),
    );
    if (coachedClubs.size === 0) return [];
    return playerRows.filter(
      (row) => row.season_year === season && coachedClubs.has(canonicalClub(row.club, aliases)),
    );
  }

  if (kind === "competition") {
    const compClubs = new Set(
      data.data.standings
        .filter(
          (row) =>
            row.season_year === season &&
            normalizeName(competitionLabelFromStanding(row)) === normEntity,
        )
        .map((row) => normalizeName(row.club_name)),
    );
    if (compClubs.size === 0) return [];
    return playerRows.filter(
      (row) => row.season_year === season && compClubs.has(canonicalClub(row.club, aliases)),
    );
  }

  if (kind === "country") {
    return playerRows.filter(
      (row) => row.season_year === season && normalizeName(row.nationality) === normEntity,
    );
  }

  return [];
}

export function getStyleSeasons(ctx: ProfileContext, playerRows: PlayerStatRow[]): number[] {
  const values = new Set<number>();
  const aliases = getClubAliasMap();
  if (ctx.kind === "player") {
    for (const row of playerRows) {
      if (!isPlayerMatch(row, ctx, ctx.name)) continue;
      values.add(row.season_year);
    }
    const history = ((ctx.profile as any)?.history ?? []) as Array<{ year?: number }>;
    for (const point of history) {
      if (point?.year && Number.isFinite(point.year)) values.add(Number(point.year));
    }
  }

  if (ctx.kind === "club") {
    for (const row of playerRows) {
      if (canonicalClub(row.club, aliases) !== canonicalClub(ctx.name, aliases)) continue;
      values.add(row.season_year);
    }
    for (const row of ctx.data.data.standings) {
      if (canonicalClub(row.club_name, aliases) !== canonicalClub(ctx.name, aliases)) continue;
      values.add(row.season_year);
    }
  }

  if (ctx.kind === "coach") {
    for (const row of ctx.data.data.coaches) {
      if (normalizeName(row.name) === normalizeName(ctx.name)) values.add(row.season_year);
    }
  }

  if (ctx.kind === "competition") {
    for (const row of ctx.data.data.standings) {
      if (normalizeName(competitionLabelFromStanding(row)) === normalizeName(ctx.name))
        values.add(row.season_year);
    }
    for (const row of playerRows) {
      if (normalizeName(row.competition) !== normalizeName(ctx.name)) continue;
      values.add(row.season_year);
    }
  }

  if (ctx.kind === "country") {
    for (const row of playerRows) {
      if (normalizeName(row.nationality) !== normalizeName(ctx.name)) continue;
      values.add(row.season_year);
    }
    for (const row of ctx.data.data.standings) {
      if (normalizeName((row as { country?: string | null }).country) !== normalizeName(ctx.name)) continue;
      values.add(row.season_year);
    }
  }

  return [...values].sort((a, b) => b - a);
}

export function analyzeStyle(
  ctx: ProfileContext,
  playerRows: PlayerStatRow[],
  season: number,
): StyleAnalysis {
  const rows = playersForEntity(ctx.kind, ctx.name, season, ctx.data, playerRows, ctx);
  const aggregate = aggregateRows(rows);
  const vector = vectorFromFeatures(aggregate.features);

  const strengths = topConcepts(vector)
    .map(styleLabel)
    .map((label) => `Excelente ${label.toLowerCase()}`);
  const weaknesses = lowConcepts(vector)
    .map(styleLabel)
    .map((label) => `Baixa expressão em ${label.toLowerCase()}`);

  return {
    entity: ctx.name,
    season,
    sampleSize: aggregate.sampleSize,
    vector,
    strengths,
    weaknesses,
    offensive: indicators(vector, [
      "finishing",
      "creativity",
      "progression",
      "transitions",
      "counterAttack",
    ]),
    defensive: indicators(vector, ["pressing", "recovery", "defensiveIntensity", "discipline"]),
    build: indicators(vector, [
      "shortPassing",
      "longPassing",
      "buildUp",
      "possession",
      "progression",
    ]),
    traits: detectTraits(vector),
    summary: buildSummary(
      ctx.kind === "player"
        ? "Este jogador"
        : ctx.kind === "club"
          ? "Esta equipa"
          : ctx.kind === "coach"
            ? "Este treinador"
            : ctx.kind === "competition"
              ? "Esta competição"
              : "Este país",
      vector,
    ),
  };
}

export function compareStyle(
  ctx: ProfileContext,
  playerRows: PlayerStatRow[],
  season: number,
): StyleComparisonResult {
  const own = analyzeStyle(ctx, playerRows, season);
  const ownVector = toArray(own.vector);

  let candidates: string[] = [];
  if (ctx.kind === "player") {
    candidates = [
      ...new Set(
        playerRows.filter((row) => row.season_year === season).map((row) => row.player_name),
      ),
    ];
  } else if (ctx.kind === "club") {
    candidates = [
      ...new Set(
        playerRows
          .filter((row) => row.season_year === season && row.club)
          .map((row) => row.club as string),
      ),
    ];
  } else if (ctx.kind === "coach") {
    candidates = [
      ...new Set(
        ctx.data.data.coaches.filter((row) => row.season_year === season).map((row) => row.name),
      ),
    ];
  } else if (ctx.kind === "competition") {
    candidates = [
      ...new Set(
        ctx.data.data.standings
          .filter((row) => row.season_year === season)
          .map((row) => competitionLabelFromStanding(row))
          .filter(Boolean),
      ),
    ];
  } else if (ctx.kind === "country") {
    candidates = [
      ...new Set(
        playerRows
          .filter((row) => row.season_year === season && row.nationality)
          .map((row) => row.nationality as string),
      ),
    ];
  }

  const items = candidates
    .filter((candidate) => normalizeName(candidate) !== normalizeName(ctx.name))
    .map((candidate) => {
      const candidateRows = playersForEntity(ctx.kind, candidate, season, ctx.data, playerRows, ctx);
      if (candidateRows.length === 0) return null;
      const candidateVector = vectorFromFeatures(aggregateRows(candidateRows).features);
      const similarity = cosineSimilarity(ownVector, toArray(candidateVector));
      return { name: candidate, similarity: Math.round(similarity * 100) };
    })
    .filter((item): item is StyleSimilarity => item != null)
    .sort((a, b) => b.similarity - a.similarity || a.name.localeCompare(b.name, "pt-PT"))
    .slice(0, 3);

  return { items };
}
