import { useMemo } from "react";
import { usePlayerUniverse } from "./player-universe";
import { getModulePolicy } from "./data-policy";

export type ResolvedPlayer = {
  uid: string;
  name: string;
  // individual domain (from player_profiles)
  individual: {
    club?: string | null;
    country?: string | null;
    age?: number | null;
    ca?: number | null;
    pa?: number | null;
    attributes?: Record<string, unknown>;
    extras?: Record<string, unknown>;
  };
  // competitive domain (reserved for competitions statistics)
  competitive?: Record<string, unknown>;
  // raw payloads
  raw: any;
};

export function resolvePlayerFromUniverseEntry(entry?: any): ResolvedPlayer | null {
  if (!entry) return null;
  return {
    uid: entry.uid,
    name: entry.name,
    individual: {
      club: entry.currentClub ?? null,
      country: entry.country ?? null,
      age: entry.age ?? null,
      ca: entry.ca ?? null,
      pa: entry.pa ?? null,
      attributes: entry.attributes ?? {},
      extras: entry.extras ?? {},
    },
    competitive: {},
    raw: entry.rawProfiles ?? entry,
  };
}

export function resolvePlayerForModule(entry?: any, module?: string): ResolvedPlayer | null {
  const full = resolvePlayerFromUniverseEntry(entry);
  if (!full) return null;
  const policy = getModulePolicy(module as any);
  const out: ResolvedPlayer = {
    uid: full.uid,
    name: full.name,
    individual: policy.domains.individual ? full.individual : ({} as ResolvedPlayer["individual"]),
    competitive: policy.domains.competitive ? full.competitive : undefined,
    raw: full.raw,
  };
  // attach history only when allowed via raw (player-universe provides it under rawProfiles grouped)
  if (policy.domains.history && entry && entry.history) {
    (out as any).history = entry.history;
  }
  return out;
}

export function useResolvedPlayerByName(name?: string | null) {
  const universe = usePlayerUniverse();
  return useMemo(() => {
    const entry = universe.getByName(name ?? null);
    return resolvePlayerFromUniverseEntry(entry);
  }, [universe, name]);
}

export function useResolvedPlayerByUid(uid?: string | null) {
  const universe = usePlayerUniverse();
  return useMemo(() => {
    const entry = universe.getByUid(uid ?? null);
    return resolvePlayerFromUniverseEntry(entry);
  }, [universe, uid]);
}

export function useResolvedPlayerForModuleByName(module?: string, name?: string | null) {
  const universe = usePlayerUniverse();
  return useMemo(() => {
    const entry = universe.getByName(name ?? null);
    return resolvePlayerForModule(entry, module);
  }, [universe, module, name]);
}

export function useResolvedPlayerForModuleByUid(module?: string, uid?: string | null) {
  const universe = usePlayerUniverse();
  return useMemo(() => {
    const entry = universe.getByUid(uid ?? null);
    return resolvePlayerForModule(entry, module);
  }, [universe, module, uid]);
}
