import { useMemo, useSyncExternalStore } from "react";

export type RecentProfileKind = "club" | "coach" | "player";

export interface RecentProfileVisit {
  kind: RecentProfileKind;
  name: string;
  path: string;
  visitedAt: string;
}

const STORAGE_KEY = "fm-profile-recent-visits-v1";
const MAX_ITEMS = 60;

type RecentState = RecentProfileVisit[];

function sanitize(input: unknown): RecentState {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x): x is RecentProfileVisit => {
      if (!x || typeof x !== "object") return false;
      const row = x as Partial<RecentProfileVisit>;
      return (
        (row.kind === "club" || row.kind === "coach" || row.kind === "player") &&
        typeof row.name === "string" &&
        row.name.length > 0 &&
        typeof row.path === "string" &&
        row.path.length > 0 &&
        typeof row.visitedAt === "string" &&
        row.visitedAt.length > 0
      );
    })
    .slice(0, MAX_ITEMS);
}

function read(): RecentState {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

let cache: RecentState = read();
const listeners = new Set<() => void>();

function write(next: RecentState) {
  if (typeof window === "undefined") return;
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const storageListener = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = read();
    for (const l of listeners) l();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", storageListener);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", storageListener);
  };
}

export function trackRecentProfileVisit(visit: Omit<RecentProfileVisit, "visitedAt">) {
  const now = new Date().toISOString();
  const deduped = cache.filter((row) => !(row.kind === visit.kind && row.name === visit.name));
  write([{ ...visit, visitedAt: now }, ...deduped].slice(0, MAX_ITEMS));
}

export function trackRecentProfileFromPath(pathname: string) {
  const match = pathname.match(/^\/(clubes|treinadores|jogadores)\/([^/]+)$/);
  if (!match) return;
  const rawName = match[2] ?? "";
  const name = decodeURIComponent(rawName);
  if (!name) return;
  const kind: RecentProfileKind =
    match[1] === "clubes" ? "club" : match[1] === "treinadores" ? "coach" : "player";
  trackRecentProfileVisit({ kind, name, path: pathname });
}

export function useRecentProfiles(limit = 20): RecentProfileVisit[] {
  const state = useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
  return useMemo(() => state.slice(0, limit), [state, limit]);
}

export function listRecentProfiles(limit = 20): RecentProfileVisit[] {
  return cache.slice(0, limit);
}
