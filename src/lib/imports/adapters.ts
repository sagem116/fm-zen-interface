import type { StoreAdapter } from "./types";

export function createNoopAdapter(id: string): StoreAdapter<null> {
  return {
    id,
    dispatch: async () => null,
  };
}
