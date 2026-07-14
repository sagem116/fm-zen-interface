/**
 * Advanced Import Report — v2.0
 *
 * Derives a rich, multi-section report from the existing ImportReport + ImportLogRow.
 * Zero changes to Import Engine, Dictionary, Rankings or calculations.
 * The report is built once, stored frozen, and never recalculated.
 */
import type { ImportReport, PipelineIssue } from "./types";

// ───────────── Shared types ─────────────

export type WarningSeverity = "info" | "suggestion" | "warning" | "critical";

export interface AdvancedWarning {
  id: string;
  severity: WarningSeverity;
  category: string;
  description: string;
  impact: string;
  recommendation: string;
  entity?: string;
  column?: string;
  line?: number;
}

export interface AdvancedColumnRecognized {
  header: string;
  sheet: string;
  columnIndex: number;
  dictionaryId: string;
  aliasUsed: string | null;
  autoResolved: boolean;
}

export interface AdvancedColumnAutoDiscovered {
  header: string;
  sheet: string;
  columnIndex: number;
  dictionaryId: string;
  suggestion: string;
  category: string;
  confidence: number;
  decision: string;
}

export interface AdvancedColumnAmbiguous {
  header: string;
  sheet: string;
  possibleMappings: string[];
  reason: string;
}

export interface AdvancedColumnMissing {
  column: string;
  impact: string;
}

export interface AdvancedColumnIgnored {
  header: string;
  sheet: string;
  occurrences: number;
}

export interface AdvancedNormalization {
  entity: string;
  original: string;
  normalized: string;
  confidence: number;
  source: string;
}

export interface AdvancedConflict {
  type: string;
  existingField: string;
  decision: string;
  value?: string;
}

export interface AdvancedAutoImprovement {
  type: string;
  count: number;
  description: string;
}

export interface AdvancedEntityStats {
  entity: string;
  created: number;
  updated: number;
  ignored: number;
  withWarnings: number;
}

export interface AdvancedSheetStats {
  name: string;
  rows: number;
  valid: number;
  warnings: number;
  errors: number;
  durationMs: number;
}

export interface AdvancedChange {
  description: string;
  count: number;
}

// ───────────── Full report ─────────────

export interface AdvancedImportReport {
  /** ISO timestamp when this report was built. */
  generatedAt: string;

  /** Section 1 — Resumo Geral */
  summary: {
    fileName: string | null;
    season: number;
    moduleType: string;
    importDate: string;
    totalDurationMs: number;
    sheetsProcessed: number;
    engineVersion: string;
    status: "ok" | "warning" | "error";
  };

  /** Section 2 — Estatísticas Gerais */
  statistics: {
    totalRows: number;
    validRows: number;
    ignoredRows: number;
    correctedRows: number;
    rowsWithWarnings: number;
    rowsWithErrors: number;
    entitiesCreated: number;
    entitiesUpdated: number;
    entitiesIgnored: number;
  };

  /** Section 3 — Colunas */
  columns: {
    recognized: AdvancedColumnRecognized[];
    autoDiscovered: AdvancedColumnAutoDiscovered[];
    ambiguous: AdvancedColumnAmbiguous[];
    missingRequired: AdvancedColumnMissing[];
    ignored: AdvancedColumnIgnored[];
  };

  /** Section 4 — Dictionary */
  dictionary: {
    newFieldsCreated: number;
    newAliasesCreated: number;
    fieldsUpdated: number;
    fieldsPending: number;
    fieldsConfirmed: number;
    fieldsIgnored: number;
  };

  /** Section 5 — Normalização */
  normalizations: AdvancedNormalization[];

  /** Section 6 — Resolução de Conflitos */
  conflicts: AdvancedConflict[];

  /** Section 7 — Validação dos Dados */
  dataValidation: {
    negativeValues: number;
    emptyValues: number;
    invalidDates: number;
    duplicates: number;
    repeatedIds: number;
    invalidAttributes: number;
    invalidPercentages: number;
    negativeMetrics: number;
    other: number;
    total: number;
  };

  /** Section 8 — Avisos (enriched) */
  warnings: AdvancedWarning[];

  /** Section 9 — Melhorias Automáticas */
  autoImprovements: AdvancedAutoImprovement[];

  /** Section 10 — Performance */
  performance: {
    readerMs: number;
    validationMs: number;
    normalizationMs: number;
    storageMs: number;
    totalMs: number;
  };

  /** Section 11 — Estatísticas por Entidade */
  entityStats: AdvancedEntityStats[];

  /** Section 12 — Estatísticas por Folha */
  sheetStats: AdvancedSheetStats[];

  /** Section 13 — Alterações Produzidas */
  changes: AdvancedChange[];

  /** Raw pipeline report (for debug / re-display of trace) */
  raw: ImportReport | null;
}

// ───────────── Builder ─────────────

function severityFromIssue(issue: PipelineIssue): WarningSeverity {
  if (issue.level === "error") return "critical";
  if (
    issue.code === "required_column_missing" ||
    issue.code === "incompatible_entity" ||
    issue.code === "incompatible_import_group"
  )
    return "critical";
  if (issue.code === "ambiguous_alias" || issue.code === "duplicate_column") return "warning";
  return "suggestion";
}

function categoryFromIssue(issue: PipelineIssue): string {
  const map: Record<string, string> = {
    required_column_missing: "Coluna obrigatória",
    duplicate_column: "Coluna duplicada",
    ambiguous_alias: "Alias ambíguo",
    incompatible_type: "Tipo incompatível",
    incompatible_import_group: "Grupo incompatível",
    incompatible_entity: "Entidade incompatível",
    unknown_column: "Coluna desconhecida",
  };
  return map[issue.code] ?? issue.code ?? "Geral";
}

function impactFromIssue(issue: PipelineIssue): string {
  if (issue.level === "error") return "Impede importação correcta deste campo";
  if (issue.code === "required_column_missing") return "Campo obrigatório em falta — dados podem estar incompletos";
  if (issue.code === "ambiguous_alias") return "Mapeamento incerto — pode gerar valores errados";
  if (issue.code === "duplicate_column") return "Coluna duplicada — apenas a primeira ocorrência é usada";
  return "Pode reduzir a qualidade dos dados";
}

function recommendationFromIssue(issue: PipelineIssue): string {
  if (issue.code === "required_column_missing")
    return "Adicionar a coluna no ficheiro de origem ou verificar o nome da coluna";
  if (issue.code === "ambiguous_alias")
    return "Confirmar o mapeamento correcto na página do Dictionary";
  if (issue.code === "duplicate_column")
    return "Remover a coluna duplicada no ficheiro de origem";
  return "Rever o ficheiro de origem e reimportar";
}

let warnIdSeq = 0;
function nextWarnId() {
  return `w-${++warnIdSeq}`;
}

export function buildAdvancedReport(opts: {
  fileName: string | null;
  season: number;
  moduleType: string;
  importDate: string;
  status: "ok" | "warning" | "error";
  raw: ImportReport | null;
}): AdvancedImportReport {
  const { fileName, season, moduleType, importDate, status, raw } = opts;
  const generatedAt = new Date().toISOString();

  // ── Section 3 ─────────────────────────────────────────
  const allResolved: AdvancedColumnRecognized[] = (raw?.resolvedColumns ?? []).map((col) => ({
    header: col.header,
    sheet: col.sheet,
    columnIndex: col.columnIndex,
    dictionaryId: col.dictionaryId,
    aliasUsed: col.aliasUsed,
    autoResolved: !!(col.aliasUsed && col.aliasUsed !== col.header),
  }));

  const autoDiscoveredSet = new Set(
    allResolved.filter((c) => c.autoResolved).map((c) => c.header + ":" + c.sheet),
  );
  const recognized = allResolved.filter((c) => !c.autoResolved);
  const autoDiscovered: AdvancedColumnAutoDiscovered[] = allResolved
    .filter((c) => c.autoResolved)
    .map((c) => ({
      header: c.header,
      sheet: c.sheet,
      columnIndex: c.columnIndex,
      dictionaryId: c.dictionaryId,
      suggestion: c.dictionaryId,
      category: c.dictionaryId.split(".")[1] ?? "metric",
      confidence: 85,
      decision: `Mapeado para ${c.dictionaryId} via alias "${c.aliasUsed}"`,
    }));

  const ambiguous: AdvancedColumnAmbiguous[] = (raw?.ambiguousAliases ?? []).map((a) => ({
    header: a.header,
    sheet: a.sheet,
    possibleMappings: a.possibleEntries,
    reason: `${a.possibleEntries.length} mapeamentos possíveis — requer confirmação`,
  }));

  const missingRequired: AdvancedColumnMissing[] = (raw?.errors ?? [])
    .filter((e) => e.code === "required_column_missing")
    .map((e) => ({
      column: e.header ?? e.message,
      impact: impactFromIssue(e),
    }));

  const ignored: AdvancedColumnIgnored[] = (raw?.unknownColumns ?? []).map((u) => ({
    header: u.headerOriginal,
    sheet: u.sheet,
    occurrences: u.occurrences,
  }));

  // ── Section 4 — Dictionary ─────────────────────────────
  const dictionary = {
    newFieldsCreated: 0,
    newAliasesCreated: autoDiscovered.length,
    fieldsUpdated: 0,
    fieldsPending: ambiguous.length,
    fieldsConfirmed: recognized.length,
    fieldsIgnored: ignored.length,
  };

  // ── Section 6 — Conflicts ──────────────────────────────
  const conflicts: AdvancedConflict[] = [
    ...(raw?.ambiguousAliases ?? []).map((a) => ({
      type: "Alias ambíguo",
      existingField: a.possibleEntries.join(", "),
      decision: "Mantido sem mapeamento — necessita revisão",
      value: a.header,
    })),
    ...(raw?.errors ?? [])
      .filter((e) => e.code === "duplicate_column")
      .map((e) => ({
        type: "Coluna duplicada",
        existingField: e.header ?? "",
        decision: "Primeira ocorrência usada, duplicado ignorado",
      })),
  ];

  // ── Section 7 — Data validation ───────────────────────
  const allIssues = [...(raw?.warnings ?? []), ...(raw?.errors ?? [])];
  const dvDuplicates = allIssues.filter((i) => i.code === "duplicate_column").length;
  const dvOther = allIssues.filter(
    (i) =>
      i.code !== "duplicate_column" &&
      i.code !== "required_column_missing" &&
      i.code !== "ambiguous_alias",
  ).length;
  const dataValidation = {
    negativeValues: 0,
    emptyValues: 0,
    invalidDates: 0,
    duplicates: dvDuplicates,
    repeatedIds: 0,
    invalidAttributes: 0,
    invalidPercentages: 0,
    negativeMetrics: 0,
    other: dvOther,
    total: allIssues.length,
  };

  // ── Section 8 — Warnings ──────────────────────────────
  const warnings: AdvancedWarning[] = [
    ...(raw?.warnings ?? []).map(
      (w): AdvancedWarning => ({
        id: nextWarnId(),
        severity: severityFromIssue(w),
        category: categoryFromIssue(w),
        description: w.message,
        impact: impactFromIssue(w),
        recommendation: recommendationFromIssue(w),
        column: w.header,
      }),
    ),
    ...(raw?.errors ?? []).map(
      (e): AdvancedWarning => ({
        id: nextWarnId(),
        severity: "critical",
        category: categoryFromIssue(e),
        description: e.message,
        impact: impactFromIssue(e),
        recommendation: recommendationFromIssue(e),
        column: e.header,
      }),
    ),
  ];

  // ── Section 9 — Auto improvements ────────────────────
  const autoImprovements: AdvancedAutoImprovement[] = [];
  if (autoDiscovered.length > 0)
    autoImprovements.push({
      type: "alias_resolution",
      count: autoDiscovered.length,
      description: `${autoDiscovered.length} coluna(s) resolvida(s) via aliases Dictionary`,
    });
  if (recognized.length > 0)
    autoImprovements.push({
      type: "columns_mapped",
      count: recognized.length,
      description: `${recognized.length} coluna(s) mapeada(s) directamente`,
    });
  if (ignored.length > 0)
    autoImprovements.push({
      type: "columns_ignored",
      count: ignored.length,
      description: `${ignored.length} coluna(s) ignorada(s) automaticamente`,
    });

  // ── Section 11 — Entity stats ─────────────────────────
  const entityStats: AdvancedEntityStats[] = [
    {
      entity: raw?.pipeline.entity ?? moduleType,
      created: raw?.statistics.importedRows ?? 0,
      updated: 0,
      ignored: raw?.statistics.skippedRows ?? 0,
      withWarnings: raw?.statistics.warnings ?? 0,
    },
  ];

  // ── Section 12 — Sheet stats ──────────────────────────
  const sheetStats: AdvancedSheetStats[] = [];
  // Build from trace events if available
  const traceBySheet = new Map<string, typeof sheetStats[0]>();
  for (const evt of raw?.trace ?? []) {
    const match = evt.message.match(/sheet[:\s]+(.+)/i);
    if (!match) continue;
    const sheetName = match[1].trim();
    if (!traceBySheet.has(sheetName)) {
      traceBySheet.set(sheetName, {
        name: sheetName,
        rows: 0,
        valid: 0,
        warnings: 0,
        errors: 0,
        durationMs: 0,
      });
    }
  }
  sheetStats.push(...traceBySheet.values());

  // ── Section 13 — Changes ──────────────────────────────
  const changes: AdvancedChange[] = [];
  const importedRows = raw?.statistics.importedRows ?? 0;
  if (importedRows > 0) {
    changes.push({
      description: `Linhas importadas (${moduleType})`,
      count: importedRows,
    });
  }
  const skippedRows = raw?.statistics.skippedRows ?? 0;
  if (skippedRows > 0) {
    changes.push({ description: "Linhas ignoradas", count: skippedRows });
  }
  if (autoDiscovered.length > 0) {
    changes.push({ description: "Aliases resolvidos automaticamente", count: autoDiscovered.length });
  }

  return {
    generatedAt,
    summary: {
      fileName,
      season,
      moduleType,
      importDate,
      totalDurationMs: raw?.timings.total ?? 0,
      sheetsProcessed: raw?.statistics.sheets ?? 0,
      engineVersion: "2.0",
      status,
    },
    statistics: {
      totalRows: raw?.statistics.rows ?? 0,
      validRows: raw?.statistics.importedRows ?? 0,
      ignoredRows: raw?.statistics.skippedRows ?? 0,
      correctedRows: autoDiscovered.length,
      rowsWithWarnings: raw?.statistics.warnings ?? 0,
      rowsWithErrors: raw?.statistics.errors ?? 0,
      entitiesCreated: importedRows,
      entitiesUpdated: 0,
      entitiesIgnored: skippedRows,
    },
    columns: { recognized, autoDiscovered, ambiguous, missingRequired, ignored },
    dictionary,
    normalizations: [],
    conflicts,
    dataValidation,
    warnings,
    autoImprovements,
    performance: {
      readerMs: raw?.timings.reader ?? 0,
      validationMs: raw?.timings.validator ?? 0,
      normalizationMs: raw?.timings.resolver ?? 0,
      storageMs: raw?.timings.dispatcher ?? 0,
      totalMs: raw?.timings.total ?? 0,
    },
    entityStats,
    sheetStats,
    changes,
    raw,
  };
}

/** Extract the stored ImportReport from a row's warnings payload.
 *  Supports three shapes:
 *   1. New rich report:      { report: ImportReport }
 *   2. Direct ImportReport:  { pipeline, timings, statistics, ... }
 *   3. Legacy warnings blob: { messages: string[], records, totalRows?, skipped?, duplicates? }
 */
export function extractRawReport(warnings: unknown): ImportReport | null {
  if (!warnings || typeof warnings !== "object") return null;
  const w = warnings as Record<string, unknown>;

  if (w.report && typeof w.report === "object") {
    return w.report as ImportReport;
  }
  if ("pipeline" in w && "timings" in w && "statistics" in w) {
    return w as unknown as ImportReport;
  }

  // Legacy shape from earlier writers — synthesize a minimal ImportReport so
  // the viewer shows real counters and the full list of warning messages.
  if (Array.isArray(w.messages) || "records" in w || "totalRows" in w) {
    return synthesizeLegacyReport(w);
  }
  return null;
}

function classifyLegacyMessage(msg: string): PipelineIssue {
  const m = String(msg ?? "").trim();
  if (/^Unknown column:/i.test(m)) {
    return { code: "unknown_column", level: "warning", message: m, header: m.replace(/^Unknown column:\s*/i, "") };
  }
  if (/^Duplicate dictionary column/i.test(m)) {
    return { code: "duplicate_column", level: "warning", message: m };
  }
  if (/^Import group mismatch/i.test(m)) {
    return { code: "incompatible_import_group", level: "warning", message: m };
  }
  if (/ignorada|skipped/i.test(m)) {
    return { code: "unknown_column", level: "warning", message: m };
  }
  return { code: "unknown_column", level: "warning", message: m };
}

function synthesizeLegacyReport(w: Record<string, unknown>): ImportReport {
  const messages: string[] = Array.isArray(w.messages)
    ? (w.messages as unknown[]).map((x) => String(x))
    : [];
  const warnings: PipelineIssue[] = messages.map(classifyLegacyMessage);

  const records = typeof w.records === "number" ? w.records : 0;
  const totalRows = typeof w.totalRows === "number" ? w.totalRows : records;
  const skipped = typeof w.skipped === "number" ? w.skipped : 0;
  const duplicates = typeof w.duplicates === "number" ? w.duplicates : 0;

  return {
    pipeline: {
      entity: "player" as never,
      importGroup: "player_profile" as never,
      adapter: "legacy",
    },
    timings: { reader: 0, resolver: 0, validator: 0, mapper: 0, dispatcher: 0, total: 0 },
    statistics: {
      workbook: null,
      sheets: 0,
      rows: totalRows,
      headers: 0,
      resolvedColumns: 0,
      manuallyResolvedColumns: 0,
      unknownColumns: warnings.filter((w) => w.code === "unknown_column").length,
      duplicateColumns: duplicates || warnings.filter((w) => w.code === "duplicate_column").length,
      aliasesUsed: 0,
      warnings: warnings.length,
      errors: 0,
      skippedRows: skipped,
      importedRows: records,
    },
    resolvedColumns: [],
    unknownColumns: [],
    ambiguousAliases: [],
    warnings,
    errors: [],
    trace: [],
  };
}

/** Format ms duration into human-readable string. */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
