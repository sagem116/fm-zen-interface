import * as XLSX from "xlsx";
import {
  mapWorkbook,
  resolveHeaders,
  validateWorkbook,
  type ImportReport,
  type PipelineDefinition,
  type WorkbookData,
} from "@/lib/imports";
import { getImportDefinition } from "@/lib/imports/registry";
import { listByCategory, normalizeDictionaryToken } from "@/lib/dictionary";

export interface PlayerProfileRow {
  rowNum: number;
  idu: string | null;
  player_name: string;
  club: string | null;
  country: string | null;
  nationality: string | null;
  age: number | null;
  ca: number | null;
  cp: number | null;
  vp: number | null;
  salary: number | null;
  height: number | null;
  weight: number | null;
  preferred_foot: string | null;
  personality: string | null;
  reputation: number | null;
  primary_position: string | null;
  secondary_positions: string | null;
  attributes: Record<string, number>;
  metrics: Record<string, number>;
  extras: Record<string, unknown>;
}

export interface ParsedPlayerProfilesFile {
  players: PlayerProfileRow[];
  attributeColumnMap: Record<string, string>;
  metricColumnMap: Record<string, string>;
  missingAttributes: string[];
  unknownColumns: string[];
  unknownColumnDetails: Array<{ header: string; suggestedName: string; aliases: string[] }>;
  duplicateColumns: string[];
  duplicatePlayers: string[];
  warnings: string[];
  fatal: string[];
  presentSheets: string[];
  ignoredSheets: string[];
  diagnostics: {
    sheets: {
      found: string[];
      expected: string[];
      expectedAliases: string[];
      recognized: string[];
      ignored: string[];
    };
    columns: {
      required: string[];
      missingRequired: string[];
      recognized: string[];
      unknown: string[];
      aliasesUsed: Array<{ from: string; to: string }>;
    };
    rows: {
      total: number;
      valid: number;
      ignored: number;
      ignoredMissingName: number;
      ignoredDuplicates: number;
    };
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
  importReport?: ImportReport;
}

const PROFILE_SHEET_ALIASES = [
  "Perfil Completo dos Jogadores",
  "Perfil Completo Jogadores",
  "Perfil dos Jogadores",
  "Perfil Jogadores",
  "Player Profiles",
  "Players Profile",
];

const REQUIRED_PROFILE_COLUMNS: Array<{ id: string; label: string }> = [
  { id: "player.identifier.idu", label: "IDU" },
  { id: "player.identifier.player_name", label: "Nome" },
  { id: "player.context.club", label: "Clube" },
  { id: "player.context.country", label: "Pais" },
];

const PROFILE_DEFINITION: PipelineDefinition = getImportDefinition("player-profile") ?? {
  id: "player-profile",
  entity: "player",
  importGroup: "player_profile",
  adapterId: "player-adapter",
};

const PROFILE_FIELD_BY_DICTIONARY_ID: Record<
  string,
  keyof Omit<PlayerProfileRow, "rowNum" | "attributes" | "metrics" | "extras">
> = {
  "player.identifier.idu": "idu",
  "player.identifier.player_name": "player_name",
  "player.context.club": "club",
  "player.context.country": "country",
  "player.profile.nationality": "nationality",
  "player.profile.age": "age",
  "player.rating.ca": "ca",
  "player.rating.cp": "cp",
  "player.profile.value": "vp",
  "player.profile.salary": "salary",
  "player.profile.height": "height",
  "player.profile.weight": "weight",
  "player.profile.preferred_foot": "preferred_foot",
  "player.profile.personality": "personality",
  "player.profile.reputation": "reputation",
  "player.context.primary_position": "primary_position",
  "player.context.secondary_positions": "secondary_positions",
};

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

function parseSalary(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const raw = String(v)
    .replace(/€/g, "")
    .replace(/p\/?\s*a/gi, "")
    .replace(/N\/D/gi, "")
    .replace(/\s/g, "")
    .trim();
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseVP(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/€/g, "").replace(/\s/g, "").trim();
  const m = s.match(/^([\d.,]+)\s*([mMkKbB])?$/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const suf = m[2];
  if (suf === "M" || suf === "b" || suf === "B") return n * 1_000_000;
  if (suf === "m" || suf === "k" || suf === "K") return n * 1_000;
  return n;
}

function parseAttribute(v: unknown): number | null {
  const n = toNum(v);
  if (n == null) return null;
  if (n < 0 || n > 20) return null;
  return Math.round(n);
}

function firstStringField(
  fields: Record<string, { value: unknown }>,
  ids: string[],
): string | null {
  for (const id of ids) {
    const value = toStr(fields[id]?.value);
    if (value) return value;
  }
  return null;
}

function pickHeaderRow(matrix: unknown[][]): { headers: string[]; startRow: number } {
  for (let i = 0; i < Math.min(matrix.length, 5); i++) {
    const row = matrix[i] ?? [];
    const filled = row.filter((c) => c != null && String(c).trim() !== "").length;
    if (filled >= 3) {
      return { headers: row.map((c) => String(c ?? "").trim()), startRow: i + 1 };
    }
  }
  const row = matrix[0] ?? [];
  return { headers: row.map((c) => String(c ?? "").trim()), startRow: 1 };
}

function pickBestSheet(wb: XLSX.WorkBook): { name: string; ignored: string[] } | null {
  let best: { name: string; rows: number } | null = null;
  const ignored: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    const rows = matrix.length;
    if (!best || rows > best.rows) {
      if (best) ignored.push(best.name);
      best = { name, rows };
    } else {
      ignored.push(name);
    }
  }
  if (!best) return null;
  return { name: best.name, ignored };
}

function normalizeSheetName(name: string): string {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/\\]+/g, "")
    .trim();
}

function isExpectedProfileSheet(name: string): boolean {
  const token = normalizeSheetName(name);
  return PROFILE_SHEET_ALIASES.some((alias) => normalizeSheetName(alias) === token);
}

function buildMissingSheetMessage(foundSheets: string[]): string {
  const found = foundSheets.length > 0 ? foundSheets : ["(sem folhas)"];
  const ignored = foundSheets.length > 0 ? foundSheets : ["(sem folhas)"];
  return [
    "Folhas encontradas",
    "------------------",
    ...found,
    "",
    "Folhas esperadas",
    "----------------",
    "Perfil Completo dos Jogadores",
    "",
    "O importador esperava uma destas folhas:",
    ...PROFILE_SHEET_ALIASES.map((alias) => `- ${alias}`),
    "",
    "Folhas ignoradas",
    "----------------",
    ...ignored,
  ].join("\n");
}

export function parsePlayerProfilesFile(
  buffer: ArrayBuffer,
  options?: { debug?: boolean },
): ParsedPlayerProfilesFile {
  const out: ParsedPlayerProfilesFile = {
    players: [],
    attributeColumnMap: {},
    metricColumnMap: {},
    missingAttributes: [],
    unknownColumns: [],
    unknownColumnDetails: [],
    duplicateColumns: [],
    duplicatePlayers: [],
    warnings: [],
    fatal: [],
    presentSheets: [],
    ignoredSheets: [],
    diagnostics: {
      sheets: {
        found: [],
        expected: ["Perfil Completo dos Jogadores"],
        expectedAliases: [...PROFILE_SHEET_ALIASES],
        recognized: [],
        ignored: [],
      },
      columns: {
        required: REQUIRED_PROFILE_COLUMNS.map((item) => item.label),
        missingRequired: [],
        recognized: [],
        unknown: [],
        aliasesUsed: [],
      },
      rows: {
        total: 0,
        valid: 0,
        ignored: 0,
        ignoredMissingName: 0,
        ignoredDuplicates: 0,
      },
      rejectionReason: null,
      summary: {
        expectedSheets: 1,
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

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array" });
  } catch {
    out.fatal.push("Ficheiro de Perfil dos Jogadores corrompido ou ilegivel.");
    return out;
  }

  out.diagnostics.sheets.found = [...wb.SheetNames];

  const recognizedSheets = wb.SheetNames.filter((name) => isExpectedProfileSheet(name));
  out.presentSheets.push(...recognizedSheets);
  out.ignoredSheets.push(...wb.SheetNames.filter((name) => !recognizedSheets.includes(name)));
  out.diagnostics.sheets.recognized = [...out.presentSheets];
  out.diagnostics.sheets.ignored = [...out.ignoredSheets];

  if (recognizedSheets.length === 0) {
    out.fatal.push(buildMissingSheetMessage(out.diagnostics.sheets.found));
    out.diagnostics.rejectionReason =
      "Nenhuma folha reconhecida para Perfil Completo dos Jogadores.";
    out.diagnostics.summary.ignoredSheets = out.ignoredSheets.length;
    return out;
  }

  const picked = pickBestSheet({
    SheetNames: recognizedSheets,
    Sheets: wb.Sheets,
  } as XLSX.WorkBook);
  if (!picked) {
    out.fatal.push("O ficheiro nao contem folhas legiveis.");
    return out;
  }

  const ws = wb.Sheets[picked.name];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  if (matrix.length < 2) {
    out.fatal.push(`Folha \"${picked.name}\" sem linhas de dados.`);
    return out;
  }

  const { headers, startRow } = pickHeaderRow(matrix);
  const workbookData: WorkbookData = {
    sheets: [
      {
        name: picked.name,
        headers,
        rows: matrix.slice(startRow) as unknown[][],
      },
    ],
  };

  const resolved = resolveHeaders(workbookData, PROFILE_DEFINITION);
  const validation = validateWorkbook(PROFILE_DEFINITION, resolved);
  const mappedRows = mapWorkbook(workbookData, PROFILE_DEFINITION, resolved);

  const requiredPresence = new Set(
    resolved.filter((item) => item.dictionaryEntry).map((item) => item.dictionaryEntry!.id),
  );
  out.diagnostics.columns.missingRequired = REQUIRED_PROFILE_COLUMNS.filter(
    (item) => !requiredPresence.has(item.id),
  ).map((item) => item.label);
  out.diagnostics.columns.recognized = [
    ...new Set(
      resolved.filter((item) => item.dictionaryEntry).map((item) => item.dictionaryEntry!.name),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
  out.diagnostics.columns.unknown = validation.unknownColumns.map(
    (column) => column.headerOriginal,
  );
  out.diagnostics.columns.aliasesUsed = resolved
    .filter(
      (item) =>
        item.dictionaryEntry &&
        item.aliasUsed &&
        normalizeDictionaryToken(item.aliasUsed) !== normalizeDictionaryToken(item.originalHeader),
    )
    .map((item) => ({ from: item.originalHeader, to: item.dictionaryEntry!.name }));

  for (const warning of validation.warnings) out.warnings.push(warning.message);
  for (const error of validation.errors) out.fatal.push(error.message);

  out.unknownColumns = validation.unknownColumns.map((column) => column.headerOriginal);
  out.unknownColumnDetails = validation.unknownColumns.map((column) => ({
    header: column.headerOriginal,
    suggestedName: column.headerOriginal,
    aliases: [column.headerOriginal],
  }));
  out.duplicateColumns = validation.duplicateColumns.flatMap((item) =>
    item.headers.map((header) => `${header} -> ${item.dictionaryId}`),
  );

  const seenAttr = new Set<string>();
  const seenMetric = new Set<string>();

  for (const header of resolved) {
    const entry = header.dictionaryEntry;
    if (!entry) continue;

    if (entry.category === "attribute") {
      out.attributeColumnMap[header.originalHeader] = entry.id;
      seenAttr.add(entry.id);
      continue;
    }
    if (entry.category === "metric") {
      out.metricColumnMap[header.originalHeader] = entry.id;
      seenMetric.add(entry.id);
    }
  }

  const allAttrs = listByCategory("attribute").filter((entry) => entry.entity === "player");
  for (const attr of allAttrs) {
    if (!seenAttr.has(attr.id)) out.missingAttributes.push(attr.name);
  }

  const seenPlayerKey = new Set<string>();
  let skippedNoName = 0;
  let skippedDuplicates = 0;
  for (const mapped of mappedRows) {
    const name = firstStringField(mapped.fields, [
      "player.identifier.player_name",
      "player.identifier.name",
    ]);
    if (!name) {
      skippedNoName++;
      continue;
    }

    const idu = firstStringField(mapped.fields, ["player.identifier.idu", "player.profile.idu"]);
    const club = toStr(mapped.fields["player.context.club"]?.value);
    const key = idu
      ? `idu:${idu}`
      : `nc:${normalizeDictionaryToken(name)}|${normalizeDictionaryToken(club ?? "")}`;

    if (seenPlayerKey.has(key)) {
      out.duplicatePlayers.push(
        idu ? `${name} (IDU ${idu})` : `${name}${club ? ` @ ${club}` : ""}`,
      );
      skippedDuplicates++;
      continue;
    }
    seenPlayerKey.add(key);

    const attributes: Record<string, number> = {};
    const metrics: Record<string, number> = {};
    const extras: Record<string, unknown> = {};

    for (const [dictionaryId, cell] of Object.entries(mapped.fields)) {
      const entry = cell.dictionaryEntry;
      if (entry.category === "attribute") {
        const value = parseAttribute(cell.value);
        if (value != null) attributes[dictionaryId] = value;
        continue;
      }
      if (entry.category === "metric") {
        const value = toNum(cell.value);
        if (value != null) metrics[dictionaryId] = value;
        continue;
      }
      if (!PROFILE_FIELD_BY_DICTIONARY_ID[dictionaryId]) {
        const value = cell.value;
        if (value != null && value !== "") extras[dictionaryId] = value;
      }
    }

    const row: PlayerProfileRow = {
      rowNum: mapped.rowNumber,
      idu,
      player_name: name,
      club,
      country: toStr(mapped.fields["player.context.country"]?.value),
      nationality: toStr(mapped.fields["player.profile.nationality"]?.value),
      age: toNum(mapped.fields["player.profile.age"]?.value),
      ca: toNum(mapped.fields["player.rating.ca"]?.value),
      cp: toNum(mapped.fields["player.rating.cp"]?.value),
      vp: parseVP(mapped.fields["player.profile.value"]?.value),
      salary: parseSalary(mapped.fields["player.profile.salary"]?.value),
      height: toNum(mapped.fields["player.profile.height"]?.value),
      weight: toNum(mapped.fields["player.profile.weight"]?.value),
      preferred_foot: toStr(mapped.fields["player.profile.preferred_foot"]?.value),
      personality: toStr(mapped.fields["player.profile.personality"]?.value),
      reputation: toNum(mapped.fields["player.profile.reputation"]?.value),
      primary_position: toStr(mapped.fields["player.context.primary_position"]?.value),
      secondary_positions: toStr(mapped.fields["player.context.secondary_positions"]?.value),
      attributes,
      metrics,
      extras,
    };

    out.players.push(row);
  }

  if (out.duplicateColumns.length) {
    out.warnings.push(`${out.duplicateColumns.length} coluna(s) duplicada(s) ignorada(s).`);
  }
  if (out.duplicatePlayers.length) {
    out.warnings.push(`${out.duplicatePlayers.length} jogador(es) duplicado(s) ignorado(s).`);
  }
  if (out.unknownColumns.length) {
    out.warnings.push(`${out.unknownColumns.length} coluna(s) desconhecida(s) ignorada(s).`);
  }
  if (out.missingAttributes.length) {
    out.warnings.push(
      `${out.missingAttributes.length} atributo(s) do dicionario ausente(s) no ficheiro.`,
    );
  }

  if (!out.players.length) {
    const reason = [
      "Motivo",
      "",
      "Nenhuma linha foi considerada valida.",
      "",
      "Colunas minimas esperadas",
      ...REQUIRED_PROFILE_COLUMNS.map((item) => {
        const ok = !out.diagnostics.columns.missingRequired.includes(item.label);
        return `${ok ? "[ok]" : "[x]"} ${item.label}`;
      }),
      "",
      `Linhas de dados: ${mappedRows.length}`,
      `Sem Nome: ${skippedNoName}`,
      `Duplicadas: ${skippedDuplicates}`,
      "",
      "Por isso nenhuma linha foi considerada valida.",
    ].join("\n");
    out.fatal.push(reason);
    out.diagnostics.rejectionReason = reason;
  } else if (skippedNoName > 0) {
    out.warnings.push(`${skippedNoName} linha(s) ignorada(s) por falta de Nome.`);
  }

  out.diagnostics.rows.total = mappedRows.length;
  out.diagnostics.rows.valid = out.players.length;
  out.diagnostics.rows.ignoredMissingName = skippedNoName;
  out.diagnostics.rows.ignoredDuplicates = skippedDuplicates;
  out.diagnostics.rows.ignored = mappedRows.length - out.players.length;
  out.diagnostics.summary.recognizedSheets = out.presentSheets.length;
  out.diagnostics.summary.ignoredSheets = out.ignoredSheets.length;
  out.diagnostics.summary.recognizedColumns = out.diagnostics.columns.recognized.length;
  out.diagnostics.summary.missingRequiredColumns = out.diagnostics.columns.missingRequired.length;
  out.diagnostics.summary.aliasesUsed = out.diagnostics.columns.aliasesUsed.length;
  out.diagnostics.summary.unknownColumns = out.unknownColumns.length;
  out.diagnostics.summary.validRows = out.players.length;
  out.diagnostics.summary.ignoredRows = out.diagnostics.rows.ignored;

  if (options?.debug) {
    out.importReport = {
      pipeline: {
        entity: PROFILE_DEFINITION.entity,
        importGroup: PROFILE_DEFINITION.importGroup,
        adapter: PROFILE_DEFINITION.adapterId,
      },
      timings: {
        reader: 0,
        resolver: 0,
        validator: 0,
        mapper: 0,
        dispatcher: 0,
        total: 0,
      },
      statistics: {
        workbook: null,
        sheets: workbookData.sheets.length,
        rows: workbookData.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
        headers: workbookData.sheets.reduce((sum, sheet) => sum + sheet.headers.length, 0),
        resolvedColumns: resolved.filter((item) => item.dictionaryEntry).length,
        manuallyResolvedColumns: resolved.filter((item) => item.resolutionMode === "manual").length,
        unknownColumns: validation.unknownColumns.length,
        duplicateColumns: validation.duplicateColumns.length,
        aliasesUsed: resolved.filter(
          (item) => item.aliasUsed && item.aliasUsed !== item.originalHeader,
        ).length,
        warnings: validation.warnings.length,
        errors: validation.errors.length,
        skippedRows: 0,
        importedRows: out.players.length,
      },
      resolvedColumns: resolved
        .filter((item) => item.dictionaryEntry)
        .map((item) => ({
          header: item.originalHeader,
          sheet: item.sheet,
          columnIndex: item.columnIndex,
          dictionaryId: item.dictionaryEntry!.id,
          aliasUsed: item.aliasUsed,
        })),
      unknownColumns: validation.unknownColumns,
      ambiguousAliases: validation.ambiguousAliases,
      warnings: validation.warnings,
      errors: validation.errors,
      trace: [],
    };
  }

  return out;
}
