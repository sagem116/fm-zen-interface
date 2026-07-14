import * as XLSX from "xlsx";
import type { WorkbookData, WorkbookSheetData } from "./types";

function pickHeaderRow(matrix: unknown[][]): number {
  const limit = Math.min(matrix.length, 8);
  let bestIndex = 0;
  let bestFilled = -1;

  for (let i = 0; i < limit; i++) {
    const row = matrix[i] ?? [];
    const filled = row.filter((cell) => cell != null && String(cell).trim() !== "").length;
    if (filled > bestFilled) {
      bestFilled = filled;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function readWorkbook(input: ArrayBuffer | WorkbookData): WorkbookData {
  if (!(input instanceof ArrayBuffer)) {
    return input;
  }

  const workbook = XLSX.read(input, { type: "array" });
  const sheets: WorkbookSheetData[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const headerRowIndex = pickHeaderRow(matrix);
    const headers = ((matrix[headerRowIndex] ?? []) as unknown[]).map((header) =>
      String(header ?? "").trim(),
    );
    const rows = (matrix.slice(headerRowIndex + 1) as unknown[][]) ?? [];
    return { name, headers, rows };
  });

  return {
    fileName: undefined,
    sheets,
  };
}
