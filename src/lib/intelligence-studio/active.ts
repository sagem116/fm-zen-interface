/**
 * Facade to read the currently active EngineConfig produced by the Studio.
 * Consumers of the Intelligence Engine can pass this into
 * `getIntelligenceEngine(config)` or the buildXProfile facades.
 */
import { useMemo } from "react";
import type { EngineConfig } from "@/lib/intelligence";
import { mergeConfig } from "./merge";
import { useStudioProfiles, useStudioSettings, loadProfiles, loadSettings } from "./store";

export function getActiveEngineConfig(): EngineConfig {
  const settings = loadSettings();
  const profiles = loadProfiles();
  const active = profiles.find((p) => p.id === settings.activeProfileId) ?? profiles[0];
  return mergeConfig(active);
}

export function useActiveEngineConfig(): EngineConfig {
  const profiles = useStudioProfiles();
  const settings = useStudioSettings();
  return useMemo(() => {
    const active = profiles.find((p) => p.id === settings.activeProfileId) ?? profiles[0];
    return mergeConfig(active);
  }, [profiles, settings.activeProfileId]);
}
