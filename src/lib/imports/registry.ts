import type { PipelineDefinition, StoreAdapter } from "./types";

const definitions = new Map<string, PipelineDefinition>();
const adapters = new Map<string, StoreAdapter>();

let defaultsInitialized = false;

function ensureDefaults() {
  if (defaultsInitialized) return;
  defaultsInitialized = true;

  const defaultDefinitions: PipelineDefinition[] = [
    {
      id: "player-profile",
      entity: "player",
      importGroup: "player_profile",
      adapterId: "player-adapter",
    },
    {
      id: "player-statistics",
      entity: "player",
      importGroup: "player_statistics",
      adapterId: "player-adapter",
    },
    {
      id: "club-information",
      entity: "club",
      importGroup: "club_information",
      adapterId: "club-adapter",
    },
    {
      id: "club-classification",
      entity: "club",
      importGroup: "club_classification",
      adapterId: "club-adapter",
    },
    {
      id: "coach-information",
      entity: "coach",
      importGroup: "coach_information",
      adapterId: "coach-adapter",
    },
    {
      id: "competition-information",
      entity: "competition",
      importGroup: "competition_information",
      adapterId: "competition-adapter",
    },
  ];

  for (const definition of defaultDefinitions) {
    definitions.set(definition.id, definition);
  }

  const defaultAdapters: StoreAdapter[] = [
    { id: "player-adapter", dispatch: async () => null },
    { id: "club-adapter", dispatch: async () => null },
    { id: "coach-adapter", dispatch: async () => null },
    { id: "competition-adapter", dispatch: async () => null },
  ];

  for (const adapter of defaultAdapters) {
    adapters.set(adapter.id, adapter);
  }
}

export function registerImportDefinition(definition: PipelineDefinition): void {
  ensureDefaults();
  definitions.set(definition.id, definition);
}

export function getImportDefinition(id: string): PipelineDefinition | null {
  ensureDefaults();
  return definitions.get(id) ?? null;
}

export function listImportDefinitions(): PipelineDefinition[] {
  ensureDefaults();
  return [...definitions.values()];
}

export function registerStoreAdapter(adapter: StoreAdapter): void {
  ensureDefaults();
  adapters.set(adapter.id, adapter);
}

export function getStoreAdapter(id: string): StoreAdapter | null {
  ensureDefaults();
  return adapters.get(id) ?? null;
}
