import { createRegistries, type Registries } from "../registry";
import type {
  DomainEntity,
  EngineConfig,
  EntityKind,
  ProfileDef,
  ProfileResult,
  TraitResult,
} from "../types";
import { buildContext } from "./context";
import { evaluateTrait } from "./evaluate";
import { buildNarrative } from "../narrative";

export interface Engine {
  config: EngineConfig;
  registries: Registries;
  buildProfile(opts: BuildProfileOpts): ProfileResult;
  listMetrics(kind?: EntityKind): EngineConfig["metrics"];
  listTraits(kind?: EntityKind): EngineConfig["traits"];
  listProfiles(kind?: EntityKind): EngineConfig["profiles"];
}

export interface BuildProfileOpts {
  entity: DomainEntity;
  cohort: readonly DomainEntity[];
  kind: EntityKind;
  profileId?: string; // defaults to first profile for the kind
  now?: Date;
}

export function createEngine(config: EngineConfig): Engine {
  const registries = createRegistries();
  registries.metrics.registerMany(config.metrics);
  registries.rules.registerMany(config.rules);
  registries.traits.registerMany(config.traits);
  registries.profiles.registerMany(config.profiles);

  return {
    config,
    registries,

    listMetrics(kind) {
      return registries.metrics.list(kind ? { kind } : undefined);
    },
    listTraits(kind) {
      return registries.traits.list(kind ? { kind } : undefined);
    },
    listProfiles(kind) {
      return registries.profiles.list(kind ? { kind } : undefined);
    },

    buildProfile(opts) {
      const profile = resolveProfile(config, opts);
      const ctx = buildContext({
        kind: opts.kind,
        cohort: opts.cohort,
        metrics: registries.metrics,
        now: opts.now,
      });

      const traits: TraitResult[] = [];
      for (const traitId of profile.traitIds) {
        const traitDef = registries.traits.get(traitId);
        if (!traitDef || traitDef.kind !== opts.kind) continue;
        traits.push(evaluateTrait(traitDef, opts.entity, ctx, registries));
      }

      const assigned = traits.filter((t) => {
        const def = registries.traits.requireGet(t.id);
        const min = def.minScore ?? 50;
        return t.score >= min;
      });

      const positives = assigned.filter((t) => t.polarity === "positive");
      const negatives = assigned.filter((t) => t.polarity === "negative");

      const strengths = [...positives]
        .sort((a, b) => b.score - a.score)
        .slice(0, profile.topStrengths ?? 3);
      const weaknesses = [...negatives]
        .sort((a, b) => b.score - a.score)
        .slice(0, profile.topWeaknesses ?? 3);

      const narrative = buildNarrative(assigned, opts.entity, config);

      return {
        kind: opts.kind,
        entityId: opts.entity.id,
        entityName: opts.entity.name,
        profileId: profile.id,
        configId: config.id,
        configName: config.name,
        configVersion: config.version,
        generatedAt: (opts.now ?? new Date()).toISOString(),
        traits: assigned,
        strengths,
        weaknesses,
        narrative,
      };
    },
  };
}

function resolveProfile(config: EngineConfig, opts: BuildProfileOpts): ProfileDef {
  if (opts.profileId) {
    const p = config.profiles.find((x) => x.id === opts.profileId);
    if (!p) throw new Error(`[intelligence] unknown profile: ${opts.profileId}`);
    if (p.kind !== opts.kind) {
      throw new Error(`[intelligence] profile ${p.id} is for ${p.kind}, not ${opts.kind}`);
    }
    return p;
  }
  const first = config.profiles.find((p) => p.kind === opts.kind);
  if (!first) throw new Error(`[intelligence] no profile registered for ${opts.kind}`);
  return first;
}
