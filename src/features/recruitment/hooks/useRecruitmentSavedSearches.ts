import { useCallback, useSyncExternalStore } from "react";
import type { RecruitmentScoutFilters } from "./useRecruitmentScoutSearch";

const STORAGE_KEY = "fm-recruitment-saved-searches-v1";

type SavedSearch = {
  id: string;
  name: string;
  filters: RecruitmentScoutFilters;
  columns: string[];
  sortBy: string;
  sortDir: "asc" | "desc";
  createdAt: string;
  favorite?: boolean;
};

function read(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let cache = read();
const listeners = new Set<() => void>();

function write(next: SavedSearch[]) {
  if (typeof window === "undefined") return;
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = read();
    for (const l of listeners) l();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useRecruitmentSavedSearches() {
  const searches = useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );

  const saveSearch = useCallback((input: Omit<SavedSearch, "id" | "createdAt">) => {
    const item: SavedSearch = {
      ...input,
      id: `saved.${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    write([item, ...cache].slice(0, 80));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    write(cache.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  }, []);

  return {
    searches,
    recent: searches.slice(0, 8),
    favorites: searches.filter((s) => s.favorite),
    saveSearch,
    toggleFavorite,
  };
}
