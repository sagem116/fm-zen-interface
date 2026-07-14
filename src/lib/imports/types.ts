import type { DictionaryEntry, DictionaryEntity, DictionaryImportGroup } from "@/lib/dictionary";

export type PipelineStage =
  "reader" | "resolver" | "validator" | "mapper" | "dispatcher" | "finished";

export interface WorkbookSheetData {
  name: string;
  headers: string[];
  rows: unknown[][];
}

export interface WorkbookData {
  fileName?: string;
  sheets: WorkbookSheetData[];
}

export interface UnknownColumnRecord {
  headerOriginal: string;
  sheet: string;
  columnIndex: number;
  occurrences: number;
}

export interface AmbiguousAliasRecord {
  header: string;
  sheet: string;
  columnIndex: number;
  possibleEntries: string[];
  status: "ambiguous";
}

export interface ResolvedHeader {
  originalHeader: string;
  sheet: string;
  columnIndex: number;
  dictionaryEntry: DictionaryEntry | null;
  possibleMatches: DictionaryEntry[];
  aliasUsed: string | null;
  resolutionMode: "automatic" | "manual" | "unknown";
}

export interface ImportCell {
  value: unknown;
  dictionaryEntry: DictionaryEntry;
  originalHeader: string;
  columnIndex: number;
}

export interface ImportRow {
  rowNumber: number;
  sheet: string;
  entity: DictionaryEntity;
  importGroup: DictionaryImportGroup;
  fields: Record<string, ImportCell>;
  unknownFields: Array<{
    value: unknown;
    originalHeader: string;
    columnIndex: number;
  }>;
}

export interface PipelineIssue {
  code:
    | "required_column_missing"
    | "duplicate_column"
    | "ambiguous_alias"
    | "incompatible_type"
    | "incompatible_import_group"
    | "incompatible_entity"
    | "unknown_column";
  level: "warning" | "error";
  message: string;
  sheet?: string;
  columnIndex?: number;
  header?: string;
}

export interface PipelineTraceEvent {
  stage: PipelineStage;
  status: "ok" | "warning" | "error";
  message: string;
  at: string;
}

export interface PipelineTimings {
  reader: number;
  resolver: number;
  validator: number;
  mapper: number;
  dispatcher: number;
  total: number;
}

export interface PipelineStatistics {
  workbook: string | null;
  sheets: number;
  rows: number;
  headers: number;
  resolvedColumns: number;
  manuallyResolvedColumns: number;
  unknownColumns: number;
  duplicateColumns: number;
  aliasesUsed: number;
  warnings: number;
  errors: number;
  skippedRows: number;
  importedRows: number;
}

export interface ImportReport {
  pipeline: {
    entity: DictionaryEntity;
    importGroup: DictionaryImportGroup;
    adapter: string;
  };
  timings: PipelineTimings;
  statistics: PipelineStatistics;
  resolvedColumns: Array<{
    header: string;
    sheet: string;
    columnIndex: number;
    dictionaryId: string;
    aliasUsed: string | null;
  }>;
  unknownColumns: UnknownColumnRecord[];
  ambiguousAliases: AmbiguousAliasRecord[];
  warnings: PipelineIssue[];
  errors: PipelineIssue[];
  trace: PipelineTraceEvent[];
}

export interface PipelineValidationResult {
  warnings: PipelineIssue[];
  errors: PipelineIssue[];
  unknownColumns: UnknownColumnRecord[];
  duplicateColumns: Array<{ sheet: string; dictionaryId: string; headers: string[] }>;
  ambiguousAliases: AmbiguousAliasRecord[];
  manualResolvedColumns: number;
}

export interface PipelineDefinition {
  id: string;
  entity: DictionaryEntity;
  importGroup: DictionaryImportGroup;
  adapterId: string;
  requiredDictionaryIds?: string[];
  acceptedSheets?: string[];
}

export interface PipelineDebugContext {
  debug: boolean;
  trace: PipelineTraceEvent[];
  timings: PipelineTimings;
  stageStart: Partial<Record<PipelineStage, number>>;
}

export interface AdapterDispatchInput {
  definition: PipelineDefinition;
  rows: ImportRow[];
  workbook: WorkbookData;
  resolvedHeaders: ResolvedHeader[];
  report: ImportReport;
}

export interface StoreAdapter<Result = unknown> {
  id: string;
  dispatch(input: AdapterDispatchInput): Promise<Result> | Result;
}

export interface RunImportOptions {
  definition: PipelineDefinition;
  workbook: ArrayBuffer | WorkbookData;
  debug?: boolean;
  manualMappings?: Record<string, string>;
}

export interface RunImportResult<Result = unknown> {
  report: ImportReport;
  rows: ImportRow[];
  result: Result | null;
}
