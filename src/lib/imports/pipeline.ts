import { dispatchWorkbook } from "./dispatcher";
import { mapWorkbook } from "./mapper";
import { readWorkbook } from "./reader";
import { createTimings, createTraceEvent, generateImportReport } from "./report";
import { resolveHeaders } from "./resolver";
import { validateWorkbook } from "./validator";
import type { PipelineTraceEvent, RunImportOptions, RunImportResult } from "./types";
import type { PipelineTimings } from "./types";

function withTiming<T, K extends keyof PipelineTimings>(
  collector: PipelineTimings,
  key: K,
  fn: () => T,
): T {
  const start = Date.now();
  const value = fn();
  collector[key] = Date.now() - start;
  return value;
}

function pushTrace(
  trace: PipelineTraceEvent[],
  debug: boolean,
  stage: PipelineTraceEvent["stage"],
  status: PipelineTraceEvent["status"],
  message: string,
) {
  if (!debug) return;
  trace.push(createTraceEvent(stage, status, message));
}

export async function runImport<Result = unknown>(
  options: RunImportOptions,
): Promise<RunImportResult<Result>> {
  const debug = Boolean(options.debug);
  const trace: PipelineTraceEvent[] = [];
  const timings = createTimings();
  const totalStart = Date.now();

  const workbook = withTiming(timings, "reader", () => readWorkbook(options.workbook));
  pushTrace(trace, debug, "reader", "ok", `Workbook loaded (${workbook.sheets.length} sheets)`);

  const resolvedHeaders = withTiming(timings, "resolver", () =>
    resolveHeaders(workbook, options.definition, options.manualMappings ?? {}),
  );
  const resolvedCount = resolvedHeaders.filter((header) => header.dictionaryEntry).length;
  const unknownCount = resolvedHeaders.length - resolvedCount;
  pushTrace(
    trace,
    debug,
    "resolver",
    unknownCount ? "warning" : "ok",
    `Headers resolved (${resolvedCount} resolved, ${unknownCount} unknown)`,
  );

  const validation = withTiming(timings, "validator", () =>
    validateWorkbook(options.definition, resolvedHeaders),
  );
  const validationStatus = validation.errors.length
    ? "error"
    : validation.warnings.length
      ? "warning"
      : "ok";
  pushTrace(
    trace,
    debug,
    "validator",
    validationStatus,
    `Validation finished (${validation.errors.length} errors, ${validation.warnings.length} warnings)`,
  );

  const mappedRows = withTiming(timings, "mapper", () =>
    mapWorkbook(workbook, options.definition, resolvedHeaders),
  );
  pushTrace(trace, debug, "mapper", "ok", `Mapping completed (${mappedRows.length} rows)`);

  let dispatchResult: Result | null = null;
  if (validation.errors.length === 0) {
    const dispatchStart = Date.now();
    dispatchResult = await dispatchWorkbook<Result>({
      definition: options.definition,
      rows: mappedRows,
      workbook,
      resolvedHeaders,
      report: {} as never,
    });
    timings.dispatcher = Date.now() - dispatchStart;
    pushTrace(
      trace,
      debug,
      "dispatcher",
      "ok",
      `Dispatch completed (${options.definition.adapterId})`,
    );
  } else {
    pushTrace(trace, debug, "dispatcher", "warning", "Dispatch skipped due to validation errors");
  }

  timings.total = Date.now() - totalStart;
  pushTrace(trace, debug, "finished", "ok", "Pipeline finished");

  const report = generateImportReport({
    definition: options.definition,
    workbook,
    resolvedHeaders,
    validation,
    timings,
    trace,
    rows: mappedRows.length,
    skippedRows: 0,
  });

  return {
    report,
    rows: mappedRows,
    result: dispatchResult,
  };
}
