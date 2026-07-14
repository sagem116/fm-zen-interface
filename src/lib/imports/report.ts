import type {
  ImportReport,
  PipelineDefinition,
  PipelineStatistics,
  PipelineTimings,
  PipelineTraceEvent,
  PipelineValidationResult,
  ResolvedHeader,
  WorkbookData,
} from "./types";

export function createTimings(): PipelineTimings {
  return {
    reader: 0,
    resolver: 0,
    validator: 0,
    mapper: 0,
    dispatcher: 0,
    total: 0,
  };
}

export function createTraceEvent(
  stage: PipelineTraceEvent["stage"],
  status: PipelineTraceEvent["status"],
  message: string,
): PipelineTraceEvent {
  return {
    stage,
    status,
    message,
    at: new Date().toISOString(),
  };
}

export function generateImportReport(args: {
  definition: PipelineDefinition;
  workbook: WorkbookData;
  resolvedHeaders: ResolvedHeader[];
  validation: PipelineValidationResult;
  timings: PipelineTimings;
  trace: PipelineTraceEvent[];
  rows: number;
  skippedRows: number;
}): ImportReport {
  const resolvedColumns = args.resolvedHeaders
    .filter((entry) => entry.dictionaryEntry)
    .map((entry) => ({
      header: entry.originalHeader,
      sheet: entry.sheet,
      columnIndex: entry.columnIndex,
      dictionaryId: entry.dictionaryEntry!.id,
      aliasUsed: entry.aliasUsed,
      resolutionMode: entry.resolutionMode,
    }));

  const duplicateColumns = args.validation.duplicateColumns.length;
  const aliasUsedCount = resolvedColumns.filter(
    (column) => column.aliasUsed && column.aliasUsed !== column.header,
  ).length;

  const statistics: PipelineStatistics = {
    workbook: args.workbook.fileName ?? null,
    sheets: args.workbook.sheets.length,
    rows: args.workbook.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
    headers: args.workbook.sheets.reduce((sum, sheet) => sum + sheet.headers.length, 0),
    resolvedColumns: resolvedColumns.length,
    manuallyResolvedColumns: args.validation.manualResolvedColumns,
    unknownColumns: args.validation.unknownColumns.length,
    duplicateColumns,
    aliasesUsed: aliasUsedCount,
    warnings: args.validation.warnings.length,
    errors: args.validation.errors.length,
    skippedRows: args.skippedRows,
    importedRows: args.rows,
  };

  return {
    pipeline: {
      entity: args.definition.entity,
      importGroup: args.definition.importGroup,
      adapter: args.definition.adapterId,
    },
    timings: args.timings,
    statistics,
    resolvedColumns,
    unknownColumns: args.validation.unknownColumns,
    ambiguousAliases: args.validation.ambiguousAliases,
    warnings: args.validation.warnings,
    errors: args.validation.errors,
    trace: args.trace,
  };
}
