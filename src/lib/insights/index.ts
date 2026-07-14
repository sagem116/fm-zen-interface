// API pública do Insight Engine.
// Uso típico:
//   import { runEngine, buildContext } from "@/lib/insights";
//   const ctx = buildContext({ rankings, clubs, players, coaches });
//   const report = await runEngine(ctx);

export * from "./types";
export { buildContext, groupRankingsByEntity, lastTwo } from "./context";
export { DETECTORS, getDetector } from "./registry";
export { runEngine } from "./engine";
export { narrate } from "./narrative";
export { TEMPLATES } from "./templates";
