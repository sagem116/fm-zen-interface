// Local favorites store — persists to localStorage; sync-only, no remote.
// Future work can plug a cloud-sync backend without touching the UI.

import { useCallback, useSyncExternalStore } from "react";
import type { ProfileEntityKind } from "./types";

const STORAGE_KEY = "fm-profile-favorites-v1";

type FavoritesMap = Record<string, true>;

function read(): FavoritesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as FavoritesMap;
  } catch {
    /* ignore */
  }
  return {};
}

let cache: FavoritesMap = read();
const listeners = new Set<() => void>();

function emit() {
  cache = read();
  for (const l of listeners) l();
}

function write(next: FavoritesMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  cache = next;
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) emit();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", storageListener);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", storageListener);
  };
}

function keyOf(kind: ProfileEntityKind, name: string): string {
  return `${kind}:${name}`;
}

export function useFavorite(kind: ProfileEntityKind, name: string) {
  const state = useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
  const key = keyOf(kind, name);
  const isFavorite = !!state[key];
  const toggle = useCallback(() => {
    const next = { ...cache };
    if (next[key]) delete next[key];
    else next[key] = true;
    write(next);
  }, [key]);
  return { isFavorite, toggle };
}

export function listFavorites(): { kind: ProfileEntityKind; name: string }[] {
  return Object.keys(cache).map((k) => {
    const [kind, ...rest] = k.split(":");
    return { kind: kind as ProfileEntityKind, name: rest.join(":") };
  });
}

export function useFavoritesList() {
  const state = useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
  return Object.keys(state).map((k) => {
    const [kind, ...rest] = k.split(":");
    return { kind: kind as ProfileEntityKind, name: rest.join(":") };
  });
}
