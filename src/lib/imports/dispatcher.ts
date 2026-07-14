import { getStoreAdapter } from "./registry";
import type {
  ImportReport,
  ImportRow,
  PipelineDefinition,
  ResolvedHeader,
  WorkbookData,
} from "./types";

export async function dispatchWorkbook<Result = unknown>(args: {
  definition: PipelineDefinition;
  rows: ImportRow[];
  workbook: WorkbookData;
  resolvedHeaders: ResolvedHeader[];
  report: ImportReport;
}): Promise<Result | null> {
  const adapter = getStoreAdapter(args.definition.adapterId);
  if (!adapter) return null;

  const grouped = new Map<string, ImportRow[]>();
  for (const row of args.rows) {
    const key = `${row.entity}|${row.importGroup}`;
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  let finalResult: Result | null = null;
  for (const rows of grouped.values()) {
    const dispatched = await adapter.dispatch({
      definition: args.definition,
      rows,
      workbook: args.workbook,
      resolvedHeaders: args.resolvedHeaders,
      report: args.report,
    });
    finalResult = dispatched as Result;
  }

  return finalResult;
}
