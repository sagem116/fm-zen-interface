import type {
  PipelineDefinition,
  PipelineIssue,
  PipelineValidationResult,
  ResolvedHeader,
  UnknownColumnRecord,
} from "./types";

function countUnknownOccurrences(resolved: ResolvedHeader[]): UnknownColumnRecord[] {
  const map = new Map<string, UnknownColumnRecord>();
  for (const header of resolved) {
    if (header.dictionaryEntry) continue;
    const key = `${header.sheet}|${header.columnIndex}|${header.originalHeader}`;
    const existing = map.get(key);
    if (existing) {
      existing.occurrences += 1;
      continue;
    }
    map.set(key, {
      headerOriginal: header.originalHeader,
      sheet: header.sheet,
      columnIndex: header.columnIndex,
      occurrences: 1,
    });
  }
  return [...map.values()];
}

export function validateWorkbook(
  definition: PipelineDefinition,
  resolved: ResolvedHeader[],
): PipelineValidationResult {
  const warnings: PipelineIssue[] = [];
  const errors: PipelineIssue[] = [];

  const unknownColumns = countUnknownOccurrences(resolved);
  for (const unknown of unknownColumns) {
    warnings.push({
      code: "unknown_column",
      level: "warning",
      message: `Unknown column: ${unknown.headerOriginal}`,
      sheet: unknown.sheet,
      columnIndex: unknown.columnIndex,
      header: unknown.headerOriginal,
    });
  }

  const duplicatesMap = new Map<
    string,
    { sheet: string; dictionaryId: string; headers: string[] }
  >();
  for (const entry of resolved) {
    if (!entry.dictionaryEntry) continue;
    const duplicateKey = `${entry.sheet}|${entry.dictionaryEntry.id}`;
    const current = duplicatesMap.get(duplicateKey);
    if (!current) {
      duplicatesMap.set(duplicateKey, {
        sheet: entry.sheet,
        dictionaryId: entry.dictionaryEntry.id,
        headers: [entry.originalHeader],
      });
      continue;
    }
    current.headers.push(entry.originalHeader);
  }

  const duplicateColumns = [...duplicatesMap.values()].filter((item) => item.headers.length > 1);
  for (const duplicate of duplicateColumns) {
    warnings.push({
      code: "duplicate_column",
      level: "warning",
      message: `Duplicate dictionary column in sheet ${duplicate.sheet}: ${duplicate.dictionaryId}`,
      sheet: duplicate.sheet,
      header: duplicate.headers.join(", "),
    });
  }

  const ambiguousAliases = resolved
    .filter((entry) => !entry.dictionaryEntry && entry.possibleMatches.length > 1)
    .map((entry) => ({
      header: entry.originalHeader,
      sheet: entry.sheet,
      columnIndex: entry.columnIndex,
      possibleEntries: entry.possibleMatches.map((match) => match.id),
      status: "ambiguous" as const,
    }));

  for (const ambiguous of ambiguousAliases) {
    warnings.push({
      code: "ambiguous_alias",
      level: "warning",
      message: `Ambiguous alias: ${ambiguous.header}`,
      sheet: ambiguous.sheet,
      columnIndex: ambiguous.columnIndex,
      header: ambiguous.header,
    });
  }

  const byId = new Set(
    resolved.filter((entry) => entry.dictionaryEntry).map((entry) => entry.dictionaryEntry!.id),
  );
  for (const requiredId of definition.requiredDictionaryIds ?? []) {
    if (byId.has(requiredId)) continue;
    errors.push({
      code: "required_column_missing",
      level: "error",
      message: `Required column missing: ${requiredId}`,
    });
  }

  for (const entry of resolved) {
    if (!entry.dictionaryEntry) continue;

    if (entry.dictionaryEntry.entity !== definition.entity) {
      errors.push({
        code: "incompatible_entity",
        level: "error",
        message: `Incompatible entity for header ${entry.originalHeader}: ${entry.dictionaryEntry.entity}`,
        sheet: entry.sheet,
        columnIndex: entry.columnIndex,
        header: entry.originalHeader,
      });
    }

    if (entry.dictionaryEntry.importGroup !== definition.importGroup) {
      warnings.push({
        code: "incompatible_import_group",
        level: "warning",
        message: `Import group mismatch for header ${entry.originalHeader}: ${entry.dictionaryEntry.importGroup}`,
        sheet: entry.sheet,
        columnIndex: entry.columnIndex,
        header: entry.originalHeader,
      });
    }
  }

  return {
    warnings,
    errors,
    unknownColumns,
    duplicateColumns,
    ambiguousAliases,
    manualResolvedColumns: resolved.filter((entry) => entry.resolutionMode === "manual").length,
  };
}
