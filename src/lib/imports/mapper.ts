import type { ImportRow, PipelineDefinition, ResolvedHeader, WorkbookData } from "./types";
import { normalizeImportValue } from "./normalization";

export function mapWorkbook(
  workbook: WorkbookData,
  definition: PipelineDefinition,
  resolvedHeaders: ResolvedHeader[],
): ImportRow[] {
  const headersBySheet = new Map<string, ResolvedHeader[]>();
  for (const resolved of resolvedHeaders) {
    if (!headersBySheet.has(resolved.sheet)) headersBySheet.set(resolved.sheet, []);
    headersBySheet.get(resolved.sheet)!.push(resolved);
  }

  const mappedRows: ImportRow[] = [];

  for (const sheet of workbook.sheets) {
    const resolved = headersBySheet.get(sheet.name) ?? [];
    if (!resolved.length) continue;

    for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
      const row = sheet.rows[rowIndex] as unknown[];
      if (!row || row.every((value) => value == null || value === "")) continue;

      const fields: ImportRow["fields"] = {};
      const unknownFields: ImportRow["unknownFields"] = [];

      for (const header of resolved) {
        const value = row[header.columnIndex];
        if (header.dictionaryEntry) {
          const normalizedValue = normalizeImportValue(value, header.dictionaryEntry.dataType);
          const current = fields[header.dictionaryEntry.id];
          const currentEmpty = !current || current.value == null || current.value === "";
          const nextEmpty = normalizedValue == null || normalizedValue === "";
          // Keep the first non-empty mapped value when duplicate headers resolve
          // to the same dictionary id in a sheet.
          if (!current || (currentEmpty && !nextEmpty)) {
            fields[header.dictionaryEntry.id] = {
              value: normalizedValue,
              dictionaryEntry: header.dictionaryEntry,
              originalHeader: header.originalHeader,
              columnIndex: header.columnIndex,
            };
          }
          continue;
        }

        unknownFields.push({
          value,
          originalHeader: header.originalHeader,
          columnIndex: header.columnIndex,
        });
      }

      mappedRows.push({
        rowNumber: rowIndex + 2,
        sheet: sheet.name,
        entity: definition.entity,
        importGroup: definition.importGroup,
        fields,
        unknownFields,
      });
    }
  }

  return mappedRows;
}
