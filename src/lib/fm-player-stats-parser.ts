import {
  mapWorkbook,
  readWorkbook,
  resolveHeaders,
  validateWorkbook,
  type PipelineDefinition,
  type WorkbookSheetData,
} from "@/lib/imports";
import {
  resolveCompetitionSheetType,
  toLegacyCompetitionType,
} from "@/lib/imports/competition-routing";
import { getImportDefinition } from "@/lib/imports/registry";

export type CompType = "superleague" | "national" | "continental" | "international";

export interface PlayerStatRow {
  season_year: number;
  comp_type: CompType;
  competition: string;
  country: string | null;
  continent: string | null;
  player_name: string;
  idu: string | null;
  nationality: string | null;
  club: string | null;
  gls: number;
  ast: number;
  games: number;
  hdj: number;
  ca: number;
  cp: number;
  vp: number;
  salary: number;
  ra: number;
  rm: number;
  rc: number;
  age: number;
  xg?: number | null;
  pass_pct?: number | null;
  tackles_per90?: number | null;
  fouls_per90?: number | null;
  shot_pct?: number | null;
  yellows?: number | null;
  reds?: number | null;
  avg_rating?: number | null;
}

export interface PlayerStatsParseResult {
  rows: PlayerStatRow[];
  bySheet: Record<string, { sheet: string; comp_type: CompType; count: number }>;
  skippedSheets: string[];
}

const PLAYER_STATS_DEFINITION: PipelineDefinition = getImportDefinition("player-statistics") ?? {
  id: "player-statistics",
  entity: "player",
  importGroup: "player_statistics",
  adapterId: "player-adapter",
};

function sheetType(name: string): CompType | null {
  const type = resolveCompetitionSheetType(name);
  return type ? toLegacyCompetitionType(type) : null;
}

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v)
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseGames(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v);
  const matches = s.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches) return 0;
  let total = 0;
  for (const m of matches) {
    const n = Number(m.replace(",", "."));
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

function parseVP(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = String(v).replace(/€/g, "").trim();
  const m = raw.match(/^([\d.,\s-]+)\s*([mMkKbB])?\s*$/);
  if (!m) return 0;
  const numStr = m[1].replace(/\s/g, "").replace(/,/g, "");
  const n = Number(numStr);
  if (!Number.isFinite(n)) return 0;
  const suf = m[2];
  if (suf === "M" || suf === "b" || suf === "B") return n * 1_000_000;
  if (suf === "m" || suf === "k" || suf === "K") return n * 1_000;
  return n;
}

function parseSalary(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v)
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function firstStringCell(fields: Record<string, { value: unknown }>, ids: string[]): string | null {
  for (const id of ids) {
    const value = str(fields[id]?.value);
    if (value) return value;
  }
  return null;
}

function firstNumberCell(
  fields: Record<string, { value: unknown }>,
  ids: string[],
  parser: (value: unknown) => number = num,
): number {
  for (const id of ids) {
    if (!fields[id]) continue;
    return parser(fields[id].value);
  }
  return 0;
}

const CONTINENT_MAP: { match: RegExp; cont: string }[] = [
  { match: /uefa|europa|champions|europa\s*league|conference\s*league/i, cont: "Europa" },
  { match: /libertadores|sudamericana|sul[-\s]?americ/i, cont: "America do Sul" },
  { match: /concacaf|north\s*american|norte\s*americ/i, cont: "America do Norte" },
  { match: /afc|asian|asia|asiat/i, cont: "Asia" },
  { match: /caf|african|africa|afric/i, cont: "Africa" },
  { match: /ofc|oceania|ocean/i, cont: "Oceania" },
];

function continentFromCompetition(name: string): string | null {
  for (const { match, cont } of CONTINENT_MAP) if (match.test(name)) return cont;
  return null;
}

function parseSheet(
  seasonYear: number,
  sheet: WorkbookSheetData,
  comp_type: CompType,
  result: PlayerStatsParseResult,
) {
  const workbook = { sheets: [sheet] };
  const resolved = resolveHeaders(workbook, PLAYER_STATS_DEFINITION);
  const validation = validateWorkbook(PLAYER_STATS_DEFINITION, resolved);
  for (const warning of validation.warnings) {
    result.skippedSheets.push(`${sheet.name}: ${warning.message}`);
  }

  const mappedRows = mapWorkbook(workbook, PLAYER_STATS_DEFINITION, resolved);
  const hasName = resolved.some(
    (entry) => entry.dictionaryEntry?.id === "player.identifier.player_name",
  );
  if (!hasName) {
    result.skippedSheets.push(`${sheet.name} (sem coluna Nome)`);
    return;
  }

  let count = 0;
  let lastCompetition = "";

  for (const mapped of mappedRows) {
    const fields = mapped.fields as Record<string, { value: unknown }>;
    const name = firstStringCell(fields, ["player.identifier.player_name"]);
    if (!name) continue;

    let competition = firstStringCell(fields, ["player.context.competition"]) ?? "";
    if (competition) {
      lastCompetition = competition;
    } else if (lastCompetition) {
      competition = lastCompetition;
    }

    if (!competition) {
      result.skippedSheets.push(
        `${sheet.name} - linha ${mapped.rowNumber} - "${name}" sem Divisao`,
      );
      continue;
    }

    const country = firstStringCell(fields, ["player.context.country"]);
    const continent = comp_type === "continental" ? continentFromCompetition(competition) : null;

    result.rows.push({
      season_year: seasonYear,
      comp_type,
      competition,
      country,
      continent,
      player_name: name,
      idu: firstStringCell(fields, ["player.identifier.idu"]),
      nationality: firstStringCell(fields, ["player.profile.nationality"]),
      club: firstStringCell(fields, ["player.context.club"]),
      gls: firstNumberCell(fields, ["player.metric.goals"]),
      ast: firstNumberCell(fields, ["player.metric.assists"]),
      games: firstNumberCell(fields, ["player.metric.stat_appearances"], parseGames),
      hdj: firstNumberCell(fields, ["player.metric.stat_man_of_the_match"]),
      ca: firstNumberCell(fields, ["player.rating.ca"]),
      cp: firstNumberCell(fields, ["player.rating.cp"]),
      vp: firstNumberCell(fields, ["player.profile.value"], parseVP),
      salary: firstNumberCell(fields, ["player.profile.salary"], parseSalary),
      ra: firstNumberCell(fields, ["player.rating.ra"]),
      rm: firstNumberCell(fields, ["player.rating.rm"]),
      rc: firstNumberCell(fields, ["player.rating.rc"]),
      age: firstNumberCell(fields, ["player.profile.age"]),
      xg: firstNumberCell(fields, ["player.metric.xg"]),
      pass_pct: firstNumberCell(fields, ["player.metric.pass_completion_pct"]),
      tackles_per90: firstNumberCell(fields, ["player.metric.stat_tackles_per_90"]),
      fouls_per90: firstNumberCell(fields, ["player.metric.stat_fouls_per_90"]),
      shot_pct: firstNumberCell(fields, ["player.metric.stat_shots_on_target_pct"]),
      yellows: firstNumberCell(fields, ["player.metric.stat_yellow_cards"]),
      reds: firstNumberCell(fields, ["player.metric.stat_red_cards"]),
      avg_rating: firstNumberCell(fields, ["player.metric.stat_average_rating"]),
    });

    count++;
  }

  result.bySheet[sheet.name] = { sheet: sheet.name, comp_type, count };
}

export function parsePlayerStatsWorkbook(
  buffer: ArrayBuffer,
  seasonYear: number,
): PlayerStatsParseResult {
  const workbook = readWorkbook(buffer);
  const result: PlayerStatsParseResult = {
    rows: [],
    bySheet: {},
    skippedSheets: [],
  };

  for (const sheet of workbook.sheets) {
    const comp_type = sheetType(sheet.name);
    if (!comp_type) {
      result.skippedSheets.push(sheet.name);
      continue;
    }
    parseSheet(seasonYear, sheet, comp_type, result);
  }

  const seen = new Map<string, number>();
  const deduped: PlayerStatRow[] = [];
  for (let i = result.rows.length - 1; i >= 0; i--) {
    const row = result.rows[i];
    const key = row.idu
      ? `${row.comp_type}|idu:${row.idu}`
      : `${row.comp_type}|nc:${row.player_name}|${row.club ?? ""}|${row.competition}`;
    if (seen.has(key)) continue;
    seen.set(key, i);
    deduped.unshift(row);
  }

  result.rows = deduped;
  return result;
}
