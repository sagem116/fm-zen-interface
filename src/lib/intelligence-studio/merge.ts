/**
 * Merges a Studio override profile with the engine's default EngineConfig.
 * Returns a fresh EngineConfig — never mutates the input.
 */
import { defaultConfig } from "@/lib/intelligence";
import type {
  EngineConfig,
  MetricDef,
  NarrativeTemplate,
  ProfileDef,
  RuleDef,
  TraitDef,
} from "@/lib/intelligence";
import type { StudioNarrativeTemplate, StudioProfile } from "./types";

/** Convert Studio text templates into engine NarrativeTemplate functions. */
function renderTemplateText(
  tpl: string,
  ctx: {
    entity: { name: string };
    trait: { score: number; level?: string; group: string; polarity: string };
  },
): string {
  return tpl
    .replaceAll("{name}", ctx.entity.name)
    .replaceAll("{score}", ctx.trait.score.toFixed(0))
    .replaceAll("{level}", ctx.trait.level ?? "")
    .replaceAll("{group}", ctx.trait.group)
    .replaceAll("{polarity}", ctx.trait.polarity);
}

function toEngineNarrative(s: StudioNarrativeTemplate): NarrativeTemplate {
  return {
    buckets: [...s.buckets]
      .sort((a, b) => b.minScore - a.minScore)
      .map((b) => ({
        minScore: b.minScore,
        text: (nctx) => renderTemplateText(b.text, nctx),
      })),
  };
}

function upsertById<T extends { id: string }>(
  base: readonly T[],
  overrides: readonly T[],
  removed: readonly string[],
): T[] {
  const map = new Map(base.map((x) => [x.id, x]));
  for (const o of overrides) map.set(o.id, o);
  for (const r of removed) map.delete(r);
  return [...map.values()];
}

export function mergeConfig(profile: StudioProfile | null | undefined): EngineConfig {
  const base = defaultConfig;
  if (!profile) return base;

  const metrics: MetricDef[] = base.metrics; // metrics are code-registered and immutable
  const rules: RuleDef[] = upsertById(
    base.rules,
    profile.upsertRules ?? [],
    profile.removedRuleIds ?? [],
  );
  const traits: TraitDef[] = upsertById(
    base.traits,
    profile.upsertTraits ?? [],
    profile.removedTraitIds ?? [],
  );
  const profiles: ProfileDef[] = upsertById(
    base.profiles,
    profile.upsertProfiles ?? [],
    profile.removedProfileIds ?? [],
  );

  const narrativeTemplates: Record<string, NarrativeTemplate> = {
    ...(base.narrativeTemplates ?? {}),
  };
  for (const n of profile.upsertNarratives ?? []) {
    narrativeTemplates[n.traitId] = toEngineNarrative(n);
  }
  for (const id of profile.removedNarrativeTraitIds ?? []) {
    delete narrativeTemplates[id];
  }

  return {
    id: `${base.id}.${profile.id}`,
    name: `${base.name} · ${profile.name}`,
    version: profile.version,
    metrics,
    rules,
    traits,
    profiles,
    narrativeTemplates,
  };
}
