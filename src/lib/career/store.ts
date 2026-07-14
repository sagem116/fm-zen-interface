import type { CareerStoreSnapshot } from "./types";
import { deepClone, nowIso } from "./utils";

export interface CareerStore {
  load(): CareerStoreSnapshot;
  save(snapshot: CareerStoreSnapshot): void;
  reset(): void;
}

export interface LocalCareerStoreOptions {
  storageKey?: string;
}

const DEFAULT_KEY = "fm-career-domain-v1";

function emptySnapshot(): CareerStoreSnapshot {
  return {
    schemaVersion: "1.0",
    careers: {},
    updatedAt: nowIso(),
  };
}

export class LocalCareerStore implements CareerStore {
  private readonly key: string;
  private memory: CareerStoreSnapshot;

  constructor(options?: LocalCareerStoreOptions) {
    this.key = options?.storageKey ?? DEFAULT_KEY;
    this.memory = emptySnapshot();
  }

  load(): CareerStoreSnapshot {
    if (typeof window === "undefined") return deepClone(this.memory);
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return deepClone(this.memory);
      const parsed = JSON.parse(raw) as CareerStoreSnapshot;
      if (parsed.schemaVersion !== "1.0") return deepClone(this.memory);
      this.memory = parsed;
      return deepClone(parsed);
    } catch {
      return deepClone(this.memory);
    }
  }

  save(snapshot: CareerStoreSnapshot): void {
    const payload: CareerStoreSnapshot = {
      ...snapshot,
      schemaVersion: "1.0",
      updatedAt: nowIso(),
    };
    this.memory = deepClone(payload);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(payload));
    } catch {
      // Ignore quota/storage exceptions in this infrastructure phase.
    }
  }

  reset(): void {
    this.memory = emptySnapshot();
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // Ignore storage exceptions.
    }
  }
}
