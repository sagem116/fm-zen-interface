/**
 * Intelligence Engine — public API.
 *
 * Phase 1: engine, registries, default config and typed facade functions.
 * No UI, no persistence, no coupling to any specific data source.
 */

import { createEngine, type Engine } from "./engine";
import { loadConfig } from "./config/store";
import type {
  Club,
  Coach,
  Competition,
  Country,
  DomainEntity,
  EngineConfig,
  EntityKind,
  Player,
  ProfileResult,
} from "./types";

export * from "./types";
export { createRegistries } from "./registry";
export { createEngine } from "./engine";
export { defaultConfig } from "./config/defaults";
export { loadConfig, saveConfig } from "./config/store";

let sharedEngine: Engine | null = null;

/** Returns a lazily-instantiated engine using the current stored config. */
export function getIntelligenceEngine(config?: EngineConfig): Engine {
  if (config) return createEngine(config);
  if (!sharedEngine) sharedEngine = createEngine(loadConfig());
  return sharedEngine;
}

/** Force a rebuild of the shared engine (e.g. after config update). */
export function resetIntelligenceEngine(): void {
  sharedEngine = null;
}

interface FacadeOpts<E extends DomainEntity> {
  entity: E;
  cohort: readonly E[];
  config?: EngineConfig;
  profileId?: string;
  now?: Date;
}

function build<E extends DomainEntity>(kind: EntityKind, opts: FacadeOpts<E>): ProfileResult {
  const engine = getIntelligenceEngine(opts.config);
  return engine.buildProfile({
    entity: opts.entity,
    cohort: opts.cohort,
    kind,
    profileId: opts.profileId,
    now: opts.now,
  });
}

export const buildClubProfile = (opts: FacadeOpts<Club>) => build("club", opts);
export const buildPlayerProfile = (opts: FacadeOpts<Player>) => build("player", opts);
export const buildCoachProfile = (opts: FacadeOpts<Coach>) => build("coach", opts);
export const buildCompetitionProfile = (opts: FacadeOpts<Competition>) =>
  build("competition", opts);
export const buildCountryProfile = (opts: FacadeOpts<Country>) => build("country", opts);
