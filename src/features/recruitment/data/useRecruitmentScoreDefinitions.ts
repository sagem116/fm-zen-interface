import { useMemo, useSyncExternalStore } from "react";
import { listScores } from "@/lib/scores";
import type { ScoreDefinition } from "@/lib/scores";

const SCORE_STUDIO_KEY = "score-studio.state.v1";

interface ScoreStudioPersisted {
  version?: number;
  scores?: ScoreDefinition[];
}

function readStudioScores(): ScoreDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCORE_STUDIO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreStudioPersisted;
    if (!Array.isArray(parsed.scores)) return [];
    return parsed.scores;
  } catch {
    return [];
  }
}

let cache = readStudioScores();
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SCORE_STUDIO_KEY) return;
    cache = readStudioScores();
    for (const l of listeners) l();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useRecruitmentScoreDefinitions() {
  const studioScores = useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );

  return useMemo(() => {
    const base = listScores();
    const map = new Map<string, ScoreDefinition>();
    for (const s of base) map.set(s.id, s);
    for (const s of studioScores) map.set(s.id, s);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
  }, [studioScores]);
}
