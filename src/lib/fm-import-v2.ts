// New season importer — parses the two Excel files that make up a season
// (Competitions file + Players file). Every sheet and every column is
// identified by NAME, never by position. Unknown sheets/columns are
// ignored (only a warning is emitted).
//
// The parser is intentionally decoupled from the DB writers so it can be
// re-used by the validator preview and by the actual importer.

import {
  mapWorkbook,
  readWorkbook,
  resolveHeaders,
  validateWorkbook,
  type PipelineDefinition,
  type WorkbookSheetData,
} from "@/lib/imports";
import {
  resolveCompetitionSheetRole,
  resolveCompetitionSheetType,
} from "@/lib/imports/competition-routing";
import { getImportDefinition } from "@/lib/imports/registry";
import { getDictionaryEntry } from "@/lib/dictionary";

// ---------- Types --------------------------------------------------------

export type CompType = "superleague" | "national" | "continental" | "international";

import type { CompetitionSheetType } from "@/lib/imports/competition-routing";
function toCompType(v: CompetitionSheetType | null): CompType | null {
  if (v == null) return null;
  return v === "super_league" ? "superleague" : v;
}

export interface ClubCountryRow {
  club: string;
  country: string | null;
  continent: string | null;
}
export interface ClubReputationRow {
  club: string;
  reputation: number | null;
  avg_attendance: number | null;
  season_ticket_holders: number | null;
}
export interface CompetitionReputationRow {
  competition: string;
  reputation: number | null;
  country: string | null;
  continent: string | null;
}

export interface CoachRow {
  idu: string | null;
  name: string;
  nationality: string | null;
  age: number | null;
  club: string | null;
  country: string | null; // for national-team coaches
  club_role: string | null;
  intl_role: string | null;
  salary: number | null;
  intl_salary: number | null;
  tactical_style: string | null;
  play_style: string | null;
  attacking_formation: string | null;
  defensive_formation: string | null;
  preferred_formation: string | null;
  secondary_formation: string | null;
  mentality: string | null;
  marking_type: string | null;
  pressing_type: string | null;
  training_type: string | null;
  personality: string | null;
  press_relationship: string | null;
  rm: number | null;
  rc: number | null;
  ca: number | null;
  cp: number | null;
  is_national_team: boolean;
}

export interface StandingRow {
  module: "superleague" | "national";
  competition: string | null;
  division_label: string | null;
  division_num: number | null;
  position: number | null;
  info: string | null;
  club_name: string;
  played: number | null;
  wins: number | null;
  vp: number | null; // superleague-only "VP" column
  penalties: number | null; // superleague-only
  draws: number | null;
  losses: number | null;
  gf: number | null;
  ga: number | null;
  gd: number | null;
  points: number | null;
  is_champion: boolean;
}

export interface BracketRow {
  competition: string;
  team1: string | null;
  team2: string | null;
  result: string | null;
  winner: string | null;
  sf1: string | null;
  sf2: string | null;
  qf1: string | null;
  qf2: string | null;
  qf3: string | null;
  qf4: string | null;
}

export interface PlayerStatRow {
  comp_type: CompType;
  competition: string;
  player_name: string;
  idu: string | null;
  nationality: string | null;
  club: string | null;
  age: number | null;
  games: number;
  gls: number;
  ast: number;
  xg: number;
  pass_pct: number;
  tackles_per90: number;
  fouls_per90: number;
  shot_pct: number;
  yellows: number;
  reds: number;
  avg_rating: number;
  ca: number;
  cp: number;
  vp: number;
  ra: number;
  rm: number;
  rc: number;
  salary: number;
}

export interface ParsedCompetitionsFile {
  clubCountry: ClubCountryRow[];
  clubReputation: ClubReputationRow[];
  competitionReputation: CompetitionReputationRow[];
  coaches: CoachRow[];
  standings: StandingRow[];
  continental: BracketRow[];
  international: BracketRow[];
  presentSheets: string[];
  ignoredSheets: string[];
  warnings: string[];
  fatal: string[]; // structural errors that block import
  diagnostics: {
    sheets: {
      found: string[];
      expected: string[];
      aliases: string[];
      recognized: string[];
      ignored: string[];
    };
    sheetReports: Array<{
      sheet: string;
      recognized: boolean;
      stage: "read" | "resolve" | "validate" | "dispatcher" | "accepted";
      reason: string;
      role: string | null;
      sheetType: CompType | null;
      required: string[];
      missingRequired: string[];
      recognizedColumns: string[];
      unknownColumns: string[];
      aliasesUsed: Array<{ from: string; to: string }>;
      validRows: number;
      ignoredRows: number;
    }>;
    summary: {
      expectedSheets: number;
      recognizedSheets: number;
      ignoredSheets: number;
      recognizedColumns: number;
      missingRequiredColumns: number;
      aliasesUsed: number;
      unknownColumns: number;
      validRows: number;
      ignoredRows: number;
    };
  };
}

export interface ParsedPlayersFile {
  players: PlayerStatRow[];
  bySheet: Record<string, { sheet: string; comp_type: CompType; count: number }>;
  ignoredSheets: string[];
  warnings: string[];
  fatal: string[];
  rejectedRows: Array<{
    rowNumber: number;
    sheet: string;
    stage: "dispatcher";
    reason: string;
    validatedFields: Array<{ label: string; ok: boolean }>;
  }>;
  diagnostics: {
    sheets: {
      found: string[];
      expected: Record<CompType, string[]>;
      recognized: string[];
      ignored: string[];
    };
    sheetReports: Array<{
      sheet: string;
      compType: CompType;
      pipeline: {
        reading: { status: "ok" | "rejected"; reason: string };
        resolver: { status: "ok" | "rejected"; reason: string };
        validation: { status: "ok" | "rejected"; reason: string };
        dispatcher: { status: "ok" | "rejected"; reason: string };
        parser: { status: "ok" | "rejected"; reason: string };
        importation: { status: "ok" | "rejected"; reason: string };
      };
      required: string[];
      missingRequired: string[];
      recognized: string[];
      unknown: string[];
      aliasesUsed: Array<{ from: string; to: string }>;
      validRows: number;
      ignoredRows: number;
    }>;
    rejectionReason: string | null;
    summary: {
      expectedSheets: number;
      recognizedSheets: number;
      ignoredSheets: number;
      recognizedColumns: number;
      missingRequiredColumns: number;
      aliasesUsed: number;
      unknownColumns: number;
      validRows: number;
      ignoredRows: number;
    };
  };
}

// ---------- Helpers ------------------------------------------------------

const normKey = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/%()]+/g, "")
    .trim();

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function toNum(v: unknown): number | null {
  if (v == null || v === "" || v === "-" || v === "—") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/\s/g, "").replace(/,/g, ".");
  const n = Number(s.replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function num0(v: unknown): number {
  const n = toNum(v);
  return n == null ? 0 : n;
}

// "88,440 € p/a", "6,727,000 € p/a", "603,000 € p/a" → number (annual)
function parseSalary(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = String(v)
    .replace(/€/g, "")
    .replace(/p\/?\s*a/gi, "")
    .replace(/N\/D/gi, "")
    .replace(/\s/g, "")
    .trim();
  if (!raw) return 0;
  const s = raw.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// VP: "11.75M €", "800k", "234000".
function parseVP(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/€/g, "").replace(/\s/g, "").trim();
  const m = s.match(/^([\d.,]+)\s*([mMkKbB])?$/);
  if (!m) return 0;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  const suf = m[2];
  if (suf === "M" || suf === "b" || suf === "B") return n * 1_000_000;
  if (suf === "m" || suf === "k" || suf === "K") return n * 1_000;
  return n;
}

// "8 (3)" -> 11
function parseGames(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const m = String(v).match(/-?\d+(?:[.,]\d+)?/g);
  if (!m) return 0;
  let total = 0;
  for (const s of m) {
    const n = Number(s.replace(",", "."));
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

function parseScore(result: string | null, t1: string | null, t2: string | null): string | null {
  if (!result) return null;
  const m = String(result).match(/(\d+)\s*[-:xX–]\s*(\d+)/);
  if (!m) return null;
  const a = Number(m[1]),
    b = Number(m[2]);
  if (a === b) return null;
  return a > b ? t1 : t2;
}

const PLAYER_STATS_DEFINITION: PipelineDefinition = getImportDefinition("player-statistics") ?? {
  id: "player-statistics",
  entity: "player",
  importGroup: "player_statistics",
  adapterId: "player-adapter",
};

const CLUB_INFORMATION_DEFINITION: PipelineDefinition = getImportDefinition("club-information") ?? {
  id: "club-information",
  entity: "club",
  importGroup: "club_information",
  adapterId: "club-adapter",
};

const CLUB_CLASSIFICATION_DEFINITION: PipelineDefinition = getImportDefinition(
  "club-classification",
) ?? {
  id: "club-classification",
  entity: "club",
  importGroup: "club_classification",
  adapterId: "club-adapter",
};

const COACH_INFORMATION_DEFINITION: PipelineDefinition = getImportDefinition(
  "coach-information",
) ?? {
  id: "coach-information",
  entity: "coach",
  importGroup: "coach_information",
  adapterId: "coach-adapter",
};

const COMPETITION_INFORMATION_DEFINITION: PipelineDefinition = getImportDefinition(
  "competition-information",
) ?? {
  id: "competition-information",
  entity: "competition",
  importGroup: "competition_information",
  adapterId: "competition-adapter",
};

const COMPETITION_SHEET_ALIASES = [
  "Superliga",
  "Super League",
  "Liga Nacional",
  "Ligas Nacionais",
  "Nacional",
  "Continental",
  "Continentais",
  "Internacional",
  "Internacionais",
];

const COMPETITION_REQUIRED_BY_ROLE: Record<
  NonNullable<ReturnType<typeof resolveCompetitionSheetRole>>,
  string[]
> = {
  club_information: ["club.identifier.name"],
  club_classification: ["club.identifier.name"],
  coach_information: ["coach.profile.name"],
  competition_information: ["competition.identifier.name"],
  standings: ["competition.classification.position", "competition.classification.club"],
  bracket: ["competition.identifier.name"],
};

function requiredColumnsForRole(
  role: NonNullable<ReturnType<typeof resolveCompetitionSheetRole>> | null,
): string[] {
  if (!role) return [];
  return COMPETITION_REQUIRED_BY_ROLE[role] ?? [];
}

function dictionaryLabel(id: string): string {
  return getDictionaryEntry(id)?.name ?? id;
}

function normalizeSheetToken(name: string): string {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-\/\\]+/g, "")
    .trim();
}

function buildCompetitionSheetFailureMessage(args: {
  sheet: string;
  stage: "read" | "resolve" | "validate" | "dispatcher";
  reason: string;
}): string {
  return [args.sheet, "", `✗ Rejeitada na etapa: ${args.stage}`, `Motivo: ${args.reason}`].join(
    "\n",
  );
}

function fieldValue<T = unknown>(fields: Record<string, { value: unknown }>, id: string): T | null {
  return (fields[id]?.value as T | undefined) ?? null;
}

function firstFieldValue(fields: Record<string, { value: unknown }>, ids: string[]): unknown {
  for (const id of ids) {
    if (fields[id] && fields[id].value != null && fields[id].value !== "") return fields[id].value;
  }
  return null;
}

function classifyCompetitionSheet(sheet: { name: string; headers: string[]; rows: unknown[][] }) {
  const role = resolveCompetitionSheetRole(sheet.name);
  if (!role) return null;

  const definitionByRole: Record<
    NonNullable<ReturnType<typeof resolveCompetitionSheetRole>>,
    PipelineDefinition
  > = {
    club_information: CLUB_INFORMATION_DEFINITION,
    club_classification: CLUB_CLASSIFICATION_DEFINITION,
    coach_information: COACH_INFORMATION_DEFINITION,
    competition_information: COMPETITION_INFORMATION_DEFINITION,
    standings: COMPETITION_INFORMATION_DEFINITION,
    bracket: COMPETITION_INFORMATION_DEFINITION,
  };

  const definition = definitionByRole[role];
  const workbook = { sheets: [sheet] };
  const resolved = resolveHeaders(workbook, definition);
  return {
    definition,
    resolved,
    role,
    sheetType: toCompType(resolveCompetitionSheetType(sheet.name)),
  };
}

function isBracketSheet(resolvedIds: Set<string>): boolean {
  return [
    "competition.classification.team1",
    "competition.classification.team2",
    "competition.classification.result",
    "competition.classification.sf1",
    "competition.classification.qf1",
  ].some((id) => resolvedIds.has(id));
}

function isStandingsSheet(resolvedIds: Set<string>): boolean {
  return [
    "competition.classification.position",
    "competition.classification.club",
    "competition.classification.points",
    "competition.classification.played",
  ].some((id) => resolvedIds.has(id));
}

export function parseCompetitionsFile(buffer: ArrayBuffer): ParsedCompetitionsFile {
  const out: ParsedCompetitionsFile = {
    clubCountry: [],
    clubReputation: [],
    competitionReputation: [],
    coaches: [],
    standings: [],
    continental: [],
    international: [],
    presentSheets: [],
    ignoredSheets: [],
    warnings: [],
    fatal: [],
    diagnostics: {
      sheets: {
        found: [],
        expected: [...COMPETITION_SHEET_ALIASES],
        aliases: [...COMPETITION_SHEET_ALIASES],
        recognized: [],
        ignored: [],
      },
      sheetReports: [],
      summary: {
        expectedSheets: COMPETITION_SHEET_ALIASES.length,
        recognizedSheets: 0,
        ignoredSheets: 0,
        recognizedColumns: 0,
        missingRequiredColumns: 0,
        aliasesUsed: 0,
        unknownColumns: 0,
        validRows: 0,
        ignoredRows: 0,
      },
    },
  };

  try {
    const workbook = readWorkbook(buffer);
    out.diagnostics.sheets.found = workbook.sheets.map((sheet) => sheet.name);
    const knownSheets = new Set<string>();

    for (const sheet of workbook.sheets) {
      const classified = classifyCompetitionSheet(sheet);
      if (!classified) {
        out.ignoredSheets.push(sheet.name);
        out.warnings.push(`Folha ignorada (nao reconhecida): ${sheet.name}`);
        out.diagnostics.sheetReports.push({
          sheet: sheet.name,
          recognized: false,
          stage: "resolve",
          reason: "O nome da folha nao corresponde a nenhum alias esperado.",
          role: null,
          sheetType: toCompType(resolveCompetitionSheetType(sheet.name)),
          required: [],
          missingRequired: [],
          recognizedColumns: [],
          unknownColumns: [],
          aliasesUsed: [],
          validRows: 0,
          ignoredRows: 0,
        });
        continue;
      }

      const { definition, resolved, role, sheetType } = classified;
      const mapped = mapWorkbook({ sheets: [sheet] }, definition, resolved);
      const resolvedIds = new Set(
        resolved.filter((entry) => entry.dictionaryEntry).map((entry) => entry.dictionaryEntry!.id),
      );
      knownSheets.add(sheet.name);

      const recognizedColumns = [
        ...new Set(
          resolved
            .filter((entry) => entry.dictionaryEntry)
            .map((entry) => entry.dictionaryEntry!.name),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
      const aliasesUsed = resolved
        .filter(
          (entry) =>
            entry.dictionaryEntry &&
            entry.aliasUsed &&
            normalizeSheetToken(entry.aliasUsed) !== normalizeSheetToken(entry.originalHeader),
        )
        .map((entry) => ({ from: entry.originalHeader, to: entry.dictionaryEntry!.name }));
      const requiredIds = requiredColumnsForRole(role);
      const required = requiredIds.map((id) => dictionaryLabel(id));
      const recognizedIds = new Set(
        resolved.filter((entry) => entry.dictionaryEntry).map((entry) => entry.dictionaryEntry!.id),
      );
      const missingRequired = requiredIds
        .filter((id) => !recognizedIds.has(id))
        .map((id) => dictionaryLabel(id));
      const unknownColumns = validationUnknownColumnsToHeaders(
        validateWorkbook(definition, resolved).unknownColumns,
      );

      let sheetStage: "read" | "resolve" | "validate" | "dispatcher" | "accepted" = "accepted";
      let reason = "Nome reconhecido e colunas compatíveis.";

      if (definition.entity === "club") {
        const hasReputation = resolvedIds.has("club.profile.reputation");
        let validRows = 0;
        let ignoredRows = 0;
        for (const row of mapped) {
          const fields = row.fields as Record<string, { value: unknown }>;
          const club =
            fieldValue<string>(fields, "club.identifier.name") ??
            fieldValue<string>(fields, "club.profile.name") ??
            null;
          if (!club) {
            ignoredRows++;
            continue;
          }
          if (hasReputation) {
            out.clubReputation.push({
              club,
              reputation: fieldValue<number>(fields, "club.profile.reputation"),
              avg_attendance: fieldValue<number>(fields, "club.profile.avg_attendance"),
              season_ticket_holders: fieldValue<number>(
                fields,
                "club.profile.season_ticket_holders",
              ),
            });
          } else {
            out.clubCountry.push({
              club,
              country: fieldValue<string>(fields, "club.profile.country"),
              continent: fieldValue<string>(fields, "club.profile.continent"),
            });
          }
          validRows++;
        }
        if (validRows === 0) {
          sheetStage = "dispatcher";
          reason = hasReputation
            ? "Nenhuma linha continha o Clube ou as colunas de reputacao esperadas."
            : "Nenhuma linha continha o Clube esperado.";
        }
        out.diagnostics.sheetReports.push({
          sheet: sheet.name,
          recognized: true,
          stage: sheetStage,
          reason,
          role,
          sheetType,
          required,
          missingRequired,
          recognizedColumns,
          unknownColumns,
          aliasesUsed,
          validRows,
          ignoredRows,
        });
        continue;
      }

      if (definition.entity === "coach") {
        let validRows = 0;
        let ignoredRows = 0;
        for (const row of mapped) {
          const fields = row.fields as Record<string, { value: unknown }>;
          const name = fieldValue<string>(fields, "coach.profile.name");
          if (!name || String(name).startsWith("http")) {
            ignoredRows++;
            continue;
          }
          const club = fieldValue<string>(fields, "coach.profile.club");
          const country = fieldValue<string>(fields, "coach.profile.country");
          out.coaches.push({
            idu: fieldValue<string>(fields, "coach.identifier.idu"),
            name,
            nationality: fieldValue<string>(fields, "coach.profile.nationality"),
            age: fieldValue<number>(fields, "coach.profile.age"),
            club,
            country,
            club_role: fieldValue<string>(fields, "coach.profile.club_role"),
            intl_role: fieldValue<string>(fields, "coach.profile.intl_role"),
            salary: fieldValue<number>(fields, "coach.contract.salary"),
            intl_salary: fieldValue<number>(fields, "coach.contract.intl_salary"),
            tactical_style: fieldValue<string>(fields, "coach.profile.tactical_style"),
            play_style: fieldValue<string>(fields, "coach.profile.play_style"),
            attacking_formation: fieldValue<string>(fields, "coach.profile.attacking_formation"),
            defensive_formation: fieldValue<string>(fields, "coach.profile.defensive_formation"),
            preferred_formation: fieldValue<string>(fields, "coach.profile.preferred_formation"),
            secondary_formation: fieldValue<string>(fields, "coach.profile.secondary_formation"),
            mentality: fieldValue<string>(fields, "coach.profile.mentality"),
            marking_type: fieldValue<string>(fields, "coach.profile.marking_type"),
            pressing_type: fieldValue<string>(fields, "coach.profile.pressing_type"),
            training_type: fieldValue<string>(fields, "coach.profile.training_type"),
            personality: fieldValue<string>(fields, "coach.profile.personality"),
            press_relationship: fieldValue<string>(fields, "coach.profile.press_relationship"),
            rm: fieldValue<number>(fields, "coach.rating.rm"),
            rc: fieldValue<number>(fields, "coach.rating.rc"),
            ca: fieldValue<number>(fields, "coach.rating.ca"),
            cp: fieldValue<number>(fields, "coach.rating.cp"),
            is_national_team: !!country && !club,
          });
          validRows++;
        }
        if (validRows === 0) {
          sheetStage = "dispatcher";
          reason = "Nenhuma linha valida continha o nome do treinador esperado.";
        }
        out.diagnostics.sheetReports.push({
          sheet: sheet.name,
          recognized: true,
          stage: sheetStage,
          reason,
          role,
          sheetType,
          required,
          missingRequired,
          recognizedColumns,
          unknownColumns,
          aliasesUsed,
          validRows,
          ignoredRows,
        });
        continue;
      }

      const classificationIds = resolvedIds;
      const sheetKind =
        role === "bracket" ? "bracket" : role === "standings" ? "standings" : "competition";

      if (sheetKind === "competition") {
        let validRows = 0;
        let ignoredRows = 0;
        for (const row of mapped) {
          const fields = row.fields as Record<string, { value: unknown }>;
          const competition = fieldValue<string>(fields, "competition.identifier.name") ?? null;
          if (!competition) {
            ignoredRows++;
            continue;
          }
          out.competitionReputation.push({
            competition,
            reputation: fieldValue<number>(fields, "competition.profile.reputation"),
            country: fieldValue<string>(fields, "competition.profile.country"),
            continent: fieldValue<string>(fields, "competition.profile.continent"),
          });
          validRows++;
        }
        if (validRows === 0) {
          sheetStage = missingRequired.length > 0 ? "validate" : "dispatcher";
          reason =
            missingRequired.length > 0
              ? `Colunas obrigatorias em falta: ${missingRequired.join(", ")}.`
              : "Nenhuma linha continha a Competicao esperada.";
        }
        out.diagnostics.sheetReports.push({
          sheet: sheet.name,
          recognized: true,
          stage: sheetStage,
          reason,
          role,
          sheetType,
          required,
          missingRequired,
          recognizedColumns,
          unknownColumns,
          aliasesUsed,
          validRows,
          ignoredRows,
        });
        continue;
      }

      if (sheetKind === "standings") {
        let validRows = 0;
        let ignoredRows = 0;
        for (const row of mapped) {
          const fields = row.fields as Record<string, { value: unknown }>;
          const club = fieldValue<string>(fields, "competition.classification.club");
          if (!club) {
            ignoredRows++;
            continue;
          }
          const info = fieldValue<string>(fields, "competition.classification.info");
          const competition = fieldValue<string>(fields, "competition.identifier.name");
          out.standings.push({
            module: sheetType === "national" ? "national" : "superleague",
            competition,
            division_label: competition,
            division_num: null,
            position: fieldValue<number>(fields, "competition.classification.position"),
            info,
            club_name: club,
            played: fieldValue<number>(fields, "competition.classification.played"),
            wins: fieldValue<number>(fields, "competition.classification.wins"),
            vp: fieldValue<number>(fields, "competition.classification.vp"),
            penalties: fieldValue<number>(fields, "competition.classification.penalties"),
            draws: fieldValue<number>(fields, "competition.classification.draws"),
            losses: fieldValue<number>(fields, "competition.classification.losses"),
            gf: fieldValue<number>(fields, "competition.classification.gf"),
            ga: fieldValue<number>(fields, "competition.classification.ga"),
            gd: fieldValue<number>(fields, "competition.classification.gd"),
            points: fieldValue<number>(fields, "competition.classification.points"),
            is_champion: normKey(info) === "c",
          });
          validRows++;
        }
        if (validRows === 0) {
          sheetStage = missingRequired.length > 0 ? "validate" : "dispatcher";
          reason =
            missingRequired.length > 0
              ? `Colunas obrigatorias em falta: ${missingRequired.join(", ")}.`
              : "Nenhuma linha continha a classificacao esperada.";
        }
        out.diagnostics.sheetReports.push({
          sheet: sheet.name,
          recognized: true,
          stage: sheetStage,
          reason,
          role,
          sheetType,
          required,
          missingRequired,
          recognizedColumns,
          unknownColumns,
          aliasesUsed,
          validRows,
          ignoredRows,
        });
        continue;
      }

      const bracketSink = sheetType === "international" ? out.international : out.continental;
      let validRows = 0;
      let ignoredRows = 0;

      for (const row of mapped) {
        const fields = row.fields as Record<string, { value: unknown }>;
        const competition = fieldValue<string>(fields, "competition.identifier.name");
        if (!competition) {
          ignoredRows++;
          continue;
        }
        const result = fieldValue<string>(fields, "competition.classification.result");
        const team1 = fieldValue<string>(fields, "competition.classification.team1");
        const team2 = fieldValue<string>(fields, "competition.classification.team2");
        bracketSink.push({
          competition,
          team1,
          team2,
          result,
          winner: parseScore(result, team1, team2),
          sf1: fieldValue<string>(fields, "competition.classification.sf1"),
          sf2: fieldValue<string>(fields, "competition.classification.sf2"),
          qf1: fieldValue<string>(fields, "competition.classification.qf1"),
          qf2: fieldValue<string>(fields, "competition.classification.qf2"),
          qf3: fieldValue<string>(fields, "competition.classification.qf3"),
          qf4: fieldValue<string>(fields, "competition.classification.qf4"),
        });
        validRows++;
      }

      if (validRows === 0) {
        sheetStage = missingRequired.length > 0 ? "validate" : "dispatcher";
        reason =
          missingRequired.length > 0
            ? `Colunas obrigatorias em falta: ${missingRequired.join(", ")}.`
            : "Nenhuma linha continha a Competicao esperada.";
      }

      out.diagnostics.sheetReports.push({
        sheet: sheet.name,
        recognized: true,
        stage: sheetStage,
        reason,
        role,
        sheetType,
        required,
        missingRequired,
        recognizedColumns,
        unknownColumns,
        aliasesUsed,
        validRows,
        ignoredRows,
      });
    }

    out.presentSheets = [...knownSheets];
    out.ignoredSheets = workbook.sheets
      .filter((sheet) => !knownSheets.has(sheet.name))
      .map((sheet) => sheet.name);
    out.diagnostics.sheets.recognized = [...out.presentSheets];
    out.diagnostics.sheets.ignored = [...out.ignoredSheets];
    out.diagnostics.summary.recognizedSheets = out.presentSheets.length;
    out.diagnostics.summary.ignoredSheets = out.ignoredSheets.length;
    out.diagnostics.summary.recognizedColumns = out.diagnostics.sheetReports.reduce(
      (sum, item) => sum + item.recognizedColumns.length,
      0,
    );
    out.diagnostics.summary.missingRequiredColumns = out.diagnostics.sheetReports.reduce(
      (sum, item) => sum + item.missingRequired.length,
      0,
    );
    out.diagnostics.summary.aliasesUsed = out.diagnostics.sheetReports.reduce(
      (sum, item) => sum + item.aliasesUsed.length,
      0,
    );
    out.diagnostics.summary.unknownColumns = out.diagnostics.sheetReports.reduce(
      (sum, item) => sum + item.unknownColumns.length,
      0,
    );
    out.diagnostics.summary.validRows = out.diagnostics.sheetReports.reduce(
      (sum, item) => sum + item.validRows,
      0,
    );
    out.diagnostics.summary.ignoredRows = out.diagnostics.sheetReports.reduce(
      (sum, item) => sum + item.ignoredRows,
      0,
    );
    return out;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    out.fatal.push(`Erro inesperado ao ler Competições: ${message}`);
    out.diagnostics.sheetReports.push({
      sheet: "(pipeline)",
      recognized: false,
      stage: "dispatcher",
      reason: message,
      role: null,
      sheetType: null,
      required: [],
      missingRequired: [],
      recognizedColumns: [],
      unknownColumns: [],
      aliasesUsed: [],
      validRows: 0,
      ignoredRows: 0,
    });
    return out;
  }
}

function validationUnknownColumnsToHeaders(columns: Array<{ headerOriginal: string }>): string[] {
  return columns.map((column) => column.headerOriginal);
}

// ---------- Players file parser -----------------------------------------

function sheetType(sheetName: string): CompType | null {
  const normalized = normKey(sheetName);
  if (normalized.includes("internac")) return "international";
  if (normalized.includes("continent")) return "continental";
  if (normalized.includes("estatisticasinternac")) return "international";
  if (normalized.includes("estatisticascontinent")) return "continental";
  if (
    normalized.includes("super") ||
    normalized.includes("divisao") ||
    normalized.includes("division") ||
    normalized.includes("estatisticassl")
  )
    return "superleague";
  if (
    normalized.includes("nacional") ||
    normalized.includes("liga") ||
    normalized.includes("estatisticasnac")
  )
    return "national";
  return null;
}

const PLAYER_SHEET_EXPECTED: Record<CompType, string[]> = {
  superleague: ["Super League", "Superliga", "Divisao", "Division", "Estatisticas SL"],
  national: ["Ligas Nacionais", "Liga Nacional", "Nacional", "Estatisticas Nacionais"],
  continental: ["Continentais", "Continental", "Estatisticas Continentais"],
  international: [
    "Internacionais",
    "Internacional",
    "International",
    "Estatisticas Internacionais",
  ],
};

const REQUIRED_PLAYER_COLUMNS: Array<{ id: string; label: string }> = [
  { id: "player.identifier.player_name", label: "Nome" },
  { id: "player.context.competition", label: "Competicao" },
  { id: "player.context.club", label: "Clube" },
  { id: "player.identifier.idu", label: "IDU" },
];

function buildMissingPlayersSheetMessage(foundSheets: string[], ignoredSheets: string[]): string {
  const found = foundSheets.length > 0 ? foundSheets : ["(sem folhas)"];
  const ignored = ignoredSheets.length > 0 ? ignoredSheets : ["(nenhuma)"];
  return [
    "Folhas encontradas",
    "------------------",
    ...found,
    "",
    "Folhas esperadas",
    "----------------",
    ...Object.entries(PLAYER_SHEET_EXPECTED).map(
      ([group, aliases]) => `${group}: ${aliases.join(" / ")}`,
    ),
    "",
    "Folhas ignoradas",
    "----------------",
    ...ignored,
  ].join("\n");
}

export function parsePlayersFile(buffer: ArrayBuffer): ParsedPlayersFile {
  const out: ParsedPlayersFile = {
    players: [],
    bySheet: {},
    ignoredSheets: [],
    warnings: [],
    fatal: [],
    rejectedRows: [],
    diagnostics: {
      sheets: {
        found: [],
        expected: PLAYER_SHEET_EXPECTED,
        recognized: [],
        ignored: [],
      },
      sheetReports: [],
      rejectionReason: null,
      summary: {
        expectedSheets: Object.keys(PLAYER_SHEET_EXPECTED).length,
        recognizedSheets: 0,
        ignoredSheets: 0,
        recognizedColumns: 0,
        missingRequiredColumns: 0,
        aliasesUsed: 0,
        unknownColumns: 0,
        validRows: 0,
        ignoredRows: 0,
      },
    },
  };

  let workbook;
  try {
    workbook = readWorkbook(buffer);
  } catch {
    out.fatal.push("Ficheiro de Jogadores corrompido ou ilegível.");
    return out;
  }

  out.diagnostics.sheets.found = workbook.sheets.map((sheet) => sheet.name);

  const claimed = new Set<string>();
  for (const sheet of workbook.sheets) {
    const type = sheetType(sheet.name);
    if (!type) continue;
    claimed.add(sheet.name);
    parsePlayerSheetWithPipeline(sheet, type, out);
  }

  out.ignoredSheets = workbook.sheets
    .map((sheet) => sheet.name)
    .filter((name) => !claimed.has(name));
  out.diagnostics.sheets.recognized = [...claimed];
  out.diagnostics.sheets.ignored = [...out.ignoredSheets];

  if (out.players.length === 0 && out.fatal.length === 0) {
    if (claimed.size === 0) {
      const reason = buildMissingPlayersSheetMessage(
        out.diagnostics.sheets.found,
        out.ignoredSheets,
      );
      out.fatal.push(reason);
      out.diagnostics.rejectionReason = "Nenhuma folha de jogadores reconhecida.";
    } else {
      const details = out.diagnostics.sheetReports
        .map((report) => {
          const parserReason = report.pipeline.parser.reason || "Sem motivo detalhado.";
          return `${report.sheet}: ${parserReason}`;
        })
        .join("\n");
      const reason = [
        "Nenhuma linha válida foi produzida pelo parser de estatísticas.",
        "",
        "Folhas reconhecidas",
        "------------------",
        ...out.diagnostics.sheets.recognized,
        "",
        "Detalhe por folha",
        "------------------",
        details || "(sem detalhe)",
      ].join("\n");
      out.fatal.push(reason);
      out.diagnostics.rejectionReason = reason;
    }
  }

  out.diagnostics.summary.recognizedSheets = out.diagnostics.sheets.recognized.length;
  out.diagnostics.summary.ignoredSheets = out.diagnostics.sheets.ignored.length;
  out.diagnostics.summary.validRows = out.players.length;
  out.diagnostics.summary.ignoredRows = out.diagnostics.sheetReports.reduce(
    (sum, item) => sum + item.ignoredRows,
    0,
  );
  out.diagnostics.summary.recognizedColumns = out.diagnostics.sheetReports.reduce(
    (sum, item) => sum + item.recognized.length,
    0,
  );
  out.diagnostics.summary.missingRequiredColumns = out.diagnostics.sheetReports.reduce(
    (sum, item) => sum + item.missingRequired.length,
    0,
  );
  out.diagnostics.summary.aliasesUsed = out.diagnostics.sheetReports.reduce(
    (sum, item) => sum + item.aliasesUsed.length,
    0,
  );
  out.diagnostics.summary.unknownColumns = out.diagnostics.sheetReports.reduce(
    (sum, item) => sum + item.unknown.length,
    0,
  );
  return out;
}

function firstStringCell(fields: Record<string, { value: unknown }>, ids: string[]): string | null {
  for (const id of ids) {
    const value = toStr(fields[id]?.value);
    if (value) return value;
  }
  return null;
}

function firstNumberCell(
  fields: Record<string, { value: unknown }>,
  ids: string[],
  parser: (value: unknown) => number = num0,
): number {
  for (const id of ids) {
    if (!fields[id]) continue;
    return parser(fields[id].value);
  }
  return 0;
}

function parsePlayerSheetWithPipeline(
  sheet: WorkbookSheetData,
  comp_type: CompType,
  out: ParsedPlayersFile,
) {
  type PipelineStep = { status: "ok" | "rejected"; reason: string };
  const pipeline: {
    reading: PipelineStep;
    resolver: PipelineStep;
    validation: PipelineStep;
    dispatcher: PipelineStep;
    parser: PipelineStep;
    importation: PipelineStep;
  } = {
    reading: { status: "ok", reason: "Folha lida com sucesso." },
    resolver: { status: "ok", reason: "Resolver executado com sucesso." },
    validation: { status: "ok", reason: "Validação executada sem rejeição estrutural." },
    dispatcher: { status: "ok", reason: "Dispatcher executado." },
    parser: { status: "ok", reason: "Parser executado com sucesso." },
    importation: { status: "ok", reason: "Folha pronta para importação." },
  };

  const workbook = { sheets: [sheet] };
  const resolved = resolveHeaders(workbook, PLAYER_STATS_DEFINITION);
  const validation = validateWorkbook(PLAYER_STATS_DEFINITION, resolved);
  const resolvedIds = new Set(
    resolved.filter((entry) => entry.dictionaryEntry).map((entry) => entry.dictionaryEntry!.id),
  );
  const missingRequired = REQUIRED_PLAYER_COLUMNS.filter((item) => !resolvedIds.has(item.id)).map(
    (item) => item.label,
  );
  const recognized = [
    ...new Set(
      resolved.filter((entry) => entry.dictionaryEntry).map((entry) => entry.dictionaryEntry!.name),
    ),
  ];
  const aliasesUsed = resolved
    .filter(
      (entry) =>
        entry.dictionaryEntry &&
        entry.aliasUsed &&
        normKey(entry.aliasUsed) !== normKey(entry.originalHeader),
    )
    .map((entry) => ({ from: entry.originalHeader, to: entry.dictionaryEntry!.name }));

  pipeline.resolver.reason = `Resolver executado (${recognized.length} colunas reconhecidas, ${validation.unknownColumns.length} desconhecidas).`;

  if (missingRequired.length > 0) {
    pipeline.validation = {
      status: "rejected",
      reason: `Colunas obrigatórias em falta: ${missingRequired.join(", ")}`,
    };
  }

  for (const warning of validation.warnings) out.warnings.push(`${sheet.name}: ${warning.message}`);

  const rows = mapWorkbook(workbook, PLAYER_STATS_DEFINITION, resolved);
  pipeline.dispatcher.reason = `Dispatcher executado (${rows.length} linhas lidas para parser).`;
  const hasName = resolved.some(
    (entry) => entry.dictionaryEntry?.id === "player.identifier.player_name",
  );
  if (!hasName) {
    pipeline.dispatcher = {
      status: "rejected",
      reason: "Coluna de Nome não foi resolvida para player.identifier.player_name.",
    };
    pipeline.parser = {
      status: "rejected",
      reason: "Parser não executado porque a coluna de Nome não foi resolvida.",
    };
    pipeline.importation = {
      status: "rejected",
      reason: "Sem linhas válidas para importação.",
    };
    out.warnings.push(`${sheet.name}: coluna de Nome não encontrada — folha ignorada.`);
    out.diagnostics.sheetReports.push({
      sheet: sheet.name,
      compType: comp_type,
      pipeline,
      required: REQUIRED_PLAYER_COLUMNS.map((item) => item.label),
      missingRequired,
      recognized,
      unknown: validation.unknownColumns.map((column) => column.headerOriginal),
      aliasesUsed,
      validRows: 0,
      ignoredRows: rows.length,
    });
    return;
  }

  let count = 0;
  let ignoredRows = 0;
  let lastCompetition = "";
  for (const row of rows) {
    const fields = row.fields as Record<string, { value: unknown }>;
    const name = firstStringCell(fields, ["player.identifier.player_name"]);
    const idu = firstStringCell(fields, ["player.identifier.idu"]);
    const club = firstStringCell(fields, ["player.context.club"]);
    let competition =
      firstStringCell(fields, ["player.context.competition"]) ??
      firstStringCell(fields, ["competition.identifier.name"]) ??
      firstStringCell(fields, ["competition.profile.competition_name"]) ??
      "";

    if (!name || name.startsWith("http")) {
      ignoredRows++;
      if (out.rejectedRows.length < 10) {
        out.rejectedRows.push({
          rowNumber: row.rowNumber,
          sheet: sheet.name,
          stage: "dispatcher",
          reason: !name ? "Nome não encontrado." : "Nome inválido (URL).",
          validatedFields: [
            { label: "IDU", ok: !!idu },
            { label: "Nome", ok: !!name && !name.startsWith("http") },
            { label: "Clube", ok: !!club },
            { label: "Competição", ok: !!competition },
          ],
        });
      }
      continue;
    }

    if (competition) {
      lastCompetition = competition;
    } else if (lastCompetition) {
      competition = lastCompetition;
    }
    if (!competition) {
      out.warnings.push(`${sheet.name}: "${name}" sem Competição — ignorado.`);
      ignoredRows++;
      if (out.rejectedRows.length < 10) {
        out.rejectedRows.push({
          rowNumber: row.rowNumber,
          sheet: sheet.name,
          stage: "dispatcher",
          reason: "Competição não encontrada na linha.",
          validatedFields: [
            { label: "IDU", ok: !!idu },
            { label: "Nome", ok: true },
            { label: "Clube", ok: !!club },
            { label: "Competição", ok: false },
          ],
        });
      }
      continue;
    }

    out.players.push({
      comp_type,
      competition,
      player_name: name,
      idu,
      nationality: firstStringCell(fields, ["player.profile.nationality"]),
      club,
      age: toNum(fields["player.profile.age"]?.value),
      games: firstNumberCell(fields, ["player.metric.stat_appearances"], parseGames),
      gls: firstNumberCell(fields, ["player.metric.goals"]),
      ast: firstNumberCell(fields, ["player.metric.assists"]),
      xg: firstNumberCell(fields, ["player.metric.xg"]),
      pass_pct: firstNumberCell(fields, ["player.metric.pass_completion_pct"]),
      tackles_per90: firstNumberCell(fields, ["player.metric.stat_tackles_per_90"]),
      fouls_per90: firstNumberCell(fields, ["player.metric.stat_fouls_per_90"]),
      shot_pct: firstNumberCell(fields, ["player.metric.stat_shots_on_target_pct"]),
      yellows: firstNumberCell(fields, ["player.metric.stat_yellow_cards"]),
      reds: firstNumberCell(fields, ["player.metric.stat_red_cards"]),
      avg_rating: firstNumberCell(fields, ["player.metric.stat_average_rating"]),
      ca: firstNumberCell(fields, ["player.rating.ca"]),
      cp: firstNumberCell(fields, ["player.rating.cp"]),
      vp: firstNumberCell(fields, ["player.profile.value"], parseVP),
      ra: firstNumberCell(fields, ["player.rating.ra"]),
      rm: firstNumberCell(fields, ["player.rating.rm"]),
      rc: firstNumberCell(fields, ["player.rating.rc"]),
      salary: firstNumberCell(fields, ["player.profile.salary"], parseSalary),
    });
    count++;
  }

  out.bySheet[sheet.name] = { sheet: sheet.name, comp_type, count };
  if (count === 0) {
    pipeline.parser = {
      status: "rejected",
      reason: `0 linhas válidas (ignoradas: ${ignoredRows}).`,
    };
    pipeline.importation = {
      status: "rejected",
      reason: "Sem linhas válidas para importação.",
    };
  } else {
    pipeline.parser = {
      status: "ok",
      reason: `Parser executado (${count} linhas válidas, ${ignoredRows} ignoradas).`,
    };
    pipeline.importation = {
      status: "ok",
      reason: `Pronta para importação (${count} linhas válidas).`,
    };
  }

  out.diagnostics.sheetReports.push({
    sheet: sheet.name,
    compType: comp_type,
    pipeline,
    required: REQUIRED_PLAYER_COLUMNS.map((item) => item.label),
    missingRequired,
    recognized,
    unknown: validation.unknownColumns.map((column) => column.headerOriginal),
    aliasesUsed,
    validRows: count,
    ignoredRows,
  });
}

// ---------- Cross-file validation ---------------------------------------

export interface ValidationReport {
  errors: string[];
  warnings: string[];
  stats: {
    clubsInCountryMap: number;
    clubsWithReputation: number;
    competitionsWithReputation: number;
    coaches: number;
    nationalTeamCoaches: number;
    standings: number;
    continentalRows: number;
    internationalRows: number;
    players: number;
    playersBySheet: Record<string, number>;
    clubsWithoutCountry: string[];
    clubsWithoutPlayers: string[];
    clubsWithoutReputation: string[];
    playersWithoutClub: number;
    coachesWithoutAssignment: string[];
    competitionsWithoutReputation: string[];
    duplicateClubs: string[];
    unmappedClubsInPlayers: string[];
  };
}

export function validate(
  comp: ParsedCompetitionsFile,
  players: ParsedPlayersFile,
): ValidationReport {
  const report: ValidationReport = {
    errors: [...comp.fatal, ...players.fatal],
    warnings: [...comp.warnings, ...players.warnings],
    stats: {
      clubsInCountryMap: comp.clubCountry.length,
      clubsWithReputation: comp.clubReputation.length,
      competitionsWithReputation: comp.competitionReputation.length,
      coaches: comp.coaches.length,
      nationalTeamCoaches: comp.coaches.filter((c) => c.is_national_team).length,
      standings: comp.standings.length,
      continentalRows: comp.continental.length,
      internationalRows: comp.international.length,
      players: players.players.length,
      playersBySheet: Object.fromEntries(
        Object.entries(players.bySheet).map(([k, v]) => [k, v.count]),
      ),
      clubsWithoutCountry: [],
      clubsWithoutPlayers: [],
      clubsWithoutReputation: [],
      playersWithoutClub: 0,
      coachesWithoutAssignment: [],
      competitionsWithoutReputation: [],
      duplicateClubs: [],
      unmappedClubsInPlayers: [],
    },
  };

  const clubsInMap = new Set(comp.clubCountry.map((c) => c.club));

  for (const c of comp.clubCountry) {
    if (!c.country) report.stats.clubsWithoutCountry.push(c.club);
  }

  const seenDup = new Set<string>();
  const dupCheck = new Set<string>();
  for (const c of comp.clubCountry) {
    if (dupCheck.has(c.club)) {
      if (!seenDup.has(c.club)) {
        report.stats.duplicateClubs.push(c.club);
        seenDup.add(c.club);
      }
    } else dupCheck.add(c.club);
  }

  const clubsWithReputation = new Set(comp.clubReputation.map((c) => c.club));
  for (const c of comp.clubCountry)
    if (!clubsWithReputation.has(c.club)) report.stats.clubsWithoutReputation.push(c.club);

  const compsWithRep = new Set(comp.competitionReputation.map((c) => c.competition));
  const compsSeen = new Set<string>();
  for (const s of comp.standings) if (s.competition) compsSeen.add(s.competition);
  for (const p of players.players) compsSeen.add(p.competition);
  for (const c of compsSeen)
    if (!compsWithRep.has(c)) report.stats.competitionsWithoutReputation.push(c);

  const clubsWithPlayers = new Set<string>();
  for (const p of players.players) {
    if (!p.club) {
      report.stats.playersWithoutClub++;
      continue;
    }
    clubsWithPlayers.add(p.club);
    if (!clubsInMap.has(p.club) && p.comp_type !== "international") {
      report.stats.unmappedClubsInPlayers.push(p.club);
    }
  }
  const unmappedSet = new Set(report.stats.unmappedClubsInPlayers);
  report.stats.unmappedClubsInPlayers = [...unmappedSet];

  for (const c of comp.clubCountry)
    if (!clubsWithPlayers.has(c.club)) report.stats.clubsWithoutPlayers.push(c.club);

  for (const c of comp.coaches) {
    if (!c.club && !c.country) report.stats.coachesWithoutAssignment.push(c.name);
  }

  return report;
}
