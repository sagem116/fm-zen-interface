import { useCallback, useSyncExternalStore } from "react";
import {
  RECRUITMENT_DEFAULT_PREFERENCES,
  RECRUITMENT_PREFERENCES_KEY,
  type RecruitmentPreferences,
} from "../constants/recruitment-defaults";

function read(): RecruitmentPreferences {
  if (typeof window === "undefined") return RECRUITMENT_DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(RECRUITMENT_PREFERENCES_KEY);
    if (!raw) return RECRUITMENT_DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<RecruitmentPreferences>;
    return { ...RECRUITMENT_DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return RECRUITMENT_DEFAULT_PREFERENCES;
  }
}

let cache = read();
const listeners = new Set<() => void>();

function write(next: RecruitmentPreferences) {
  if (typeof window === "undefined") return;
  cache = next;
  window.localStorage.setItem(RECRUITMENT_PREFERENCES_KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== RECRUITMENT_PREFERENCES_KEY) return;
    cache = read();
    for (const l of listeners) l();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useRecruitmentPreferences() {
  const prefs = useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );

  const update = useCallback((patch: Partial<RecruitmentPreferences>) => {
    write({ ...cache, ...patch });
  }, []);

  return { prefs, update };
}
