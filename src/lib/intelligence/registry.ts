/**
 * In-memory registries for metrics, rules, traits and profiles.
 *
 * The engine reads its definitions from an EngineConfig, but registries
 * are also exposed so future modules (Intelligence Studio, plugins) can
 * register additional definitions at runtime without touching the engine.
 */

import type { EntityKind, MetricDef, ProfileDef, RuleDef, TraitDef } from "./types";

class TypedRegistry<T extends { id: string; kind?: EntityKind }> {
  private items = new Map<string, T>();

  register(item: T): void {
    if (this.items.has(item.id)) {
      throw new Error(`[intelligence] duplicate id: ${item.id}`);
    }
    this.items.set(item.id, item);
  }

  registerMany(items: readonly T[]): void {
    for (const it of items) this.register(it);
  }

  upsert(item: T): void {
    this.items.set(item.id, item);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  requireGet(id: string): T {
    const it = this.items.get(id);
    if (!it) throw new Error(`[intelligence] missing id: ${id}`);
    return it;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  list(filter?: { kind?: EntityKind }): T[] {
    const all = [...this.items.values()];
    if (!filter?.kind) return all;
    return all.filter((it) => it.kind === filter.kind);
  }

  clear(): void {
    this.items.clear();
  }
}

export class MetricRegistry extends TypedRegistry<MetricDef> {}
export class RuleRegistry extends TypedRegistry<RuleDef> {}
export class TraitRegistry extends TypedRegistry<TraitDef> {}
export class ProfileRegistry extends TypedRegistry<ProfileDef> {}

export interface Registries {
  metrics: MetricRegistry;
  rules: RuleRegistry;
  traits: TraitRegistry;
  profiles: ProfileRegistry;
}

export function createRegistries(): Registries {
  return {
    metrics: new MetricRegistry(),
    rules: new RuleRegistry(),
    traits: new TraitRegistry(),
    profiles: new ProfileRegistry(),
  };
}
