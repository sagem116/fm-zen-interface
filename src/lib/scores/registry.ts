import type {
  AttributeDefinition,
  AttributeRegistry,
  ContextDefinition,
  ContextRegistry,
  MetricDefinition,
  MetricRegistry,
  ModifierDefinition,
  ModifierRegistry,
  ScoreDefinition,
  ScoreProfile,
  ScoreProfileRegistry,
  ScoreRegistries,
  ScoreRegistry,
} from "./types";

class InMemoryRegistry<T extends { id: string }> {
  private readonly items = new Map<string, T>();

  register(item: T): void {
    if (this.items.has(item.id)) {
      throw new Error(`[scores] duplicate id: ${item.id}`);
    }
    this.items.set(item.id, item);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  list(): T[] {
    return [...this.items.values()];
  }

  has(id: string): boolean {
    return this.items.has(id);
  }
}

export class AttributeRegistryImpl
  extends InMemoryRegistry<AttributeDefinition>
  implements AttributeRegistry {}

export class MetricRegistryImpl
  extends InMemoryRegistry<MetricDefinition>
  implements MetricRegistry {}

export class ContextRegistryImpl
  extends InMemoryRegistry<ContextDefinition>
  implements ContextRegistry {}

export class ModifierRegistryImpl
  extends InMemoryRegistry<ModifierDefinition>
  implements ModifierRegistry {}

export class ScoreRegistryImpl extends InMemoryRegistry<ScoreDefinition> implements ScoreRegistry {}

export class ScoreProfileRegistryImpl
  extends InMemoryRegistry<ScoreProfile>
  implements ScoreProfileRegistry {}

export function createScoreRegistries(): ScoreRegistries {
  return {
    attributes: new AttributeRegistryImpl(),
    metrics: new MetricRegistryImpl(),
    contexts: new ContextRegistryImpl(),
    modifiers: new ModifierRegistryImpl(),
    scores: new ScoreRegistryImpl(),
    scoreProfiles: new ScoreProfileRegistryImpl(),
  };
}
