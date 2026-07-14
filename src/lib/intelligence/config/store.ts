/**
 * Config store — Phase 1 stub.
 *
 * For now this simply returns the bundled default config. Phase 3
 * (Intelligence Studio) will replace this with a persisted store that
 * loads user-authored configurations.
 */
import type { EngineConfig } from "../types";
import { defaultConfig } from "./defaults";

export function loadConfig(): EngineConfig {
  return defaultConfig;
}

export function saveConfig(_config: EngineConfig): void {
  // Intentionally a no-op in Phase 1. Kept as a stable API surface.
}
