import { defaultScoreEngineConfig } from "./defaults";
import type { ScoreEngineConfig } from "../types";

export function loadScoreEngineConfig(): ScoreEngineConfig {
  return defaultScoreEngineConfig;
}

export function saveScoreEngineConfig(_config: ScoreEngineConfig): void {
  // Intentionally a no-op in phase 1.1.
}
