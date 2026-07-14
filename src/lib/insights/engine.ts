// Executor determinístico. Corre detectores, isola erros, agrega, ordena.

import { DETECTORS } from "./registry";
import type { Detector, EngineOptions, EngineRunReport, Insight, InsightContext } from "./types";

export async function runEngine(
  ctx: InsightContext,
  options: EngineOptions = {},
): Promise<EngineRunReport> {
  const started = Date.now();
  const ranByDetector: Record<string, number> = {};
  const errors: EngineRunReport["errors"] = [];
  const insights: Insight[] = [];

  const selected: Detector[] = DETECTORS.filter((d) => {
    if (options.only && !options.only.includes(d.id)) return false;
    if (options.categories && !options.categories.includes(d.category)) return false;
    return true;
  });

  for (const d of selected) {
    try {
      const result = await d.run(ctx);
      ranByDetector[d.id] = result.length;
      insights.push(...result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ detector: d.id, error: msg });
      ranByDetector[d.id] = 0;
      if (options.strict) throw err;
    }
  }

  insights.sort((a, b) => b.importance - a.importance || b.confidence - a.confidence);

  const limited = options.limit && options.limit > 0 ? insights.slice(0, options.limit) : insights;

  return {
    insights: limited,
    ranByDetector,
    errors,
    durationMs: Date.now() - started,
  };
}
