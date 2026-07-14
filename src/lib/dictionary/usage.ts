/**
 * Dictionary v2 — Usage Statistics
 *
 * Tracks per-entry usage: how many times an entry appeared in imports,
 * which files/seasons, and when it was first/last seen.
 * Stored in localStorage. Zero impact on engines or calculations.
 */
import type { DictionaryUsageStats } from "./types";

const USAGE_KEY = "fm-dictionary-usage-v1";

function loadUsage(): Record<string, DictionaryUsageStats> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DictionaryUsageStats>;
  } catch {
    return {};
  }
}

function saveUsage(data: Record<string, DictionaryUsageStats>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors silently
  }
}

export function getDictionaryUsageStats(entryId: string): DictionaryUsageStats | null {
  return loadUsage()[entryId] ?? null;
}

export function getAllDictionaryUsageStats(): Record<string, DictionaryUsageStats> {
  return loadUsage();
}

export function updateDictionaryUsageStats(
  entryId: string,
  opts: { file?: string; season?: string } = {},
): void {
  const all = loadUsage();
  const now = new Date().toISOString();
  const prev: DictionaryUsageStats = all[entryId] ?? {
    importCount: 0,
    firstUsedAt: null,
    lastUsedAt: null,
    lastFile: null,
    lastSeason: null,
    totalOccurrences: 0,
  };
  all[entryId] = {
    importCount: prev.importCount + 1,
    firstUsedAt: prev.firstUsedAt ?? now,
    lastUsedAt: now,
    lastFile: opts.file ?? prev.lastFile,
    lastSeason: opts.season ?? prev.lastSeason,
    totalOccurrences: prev.totalOccurrences + 1,
  };
  saveUsage(all);
}

/** Update usage for many entries at once (e.g. after an import run). */
export function batchUpdateDictionaryUsageStats(
  entryIds: string[],
  opts: { file?: string; season?: string } = {},
): void {
  if (entryIds.length === 0) return;
  const all = loadUsage();
  const now = new Date().toISOString();
  for (const entryId of entryIds) {
    const prev: DictionaryUsageStats = all[entryId] ?? {
      importCount: 0,
      firstUsedAt: null,
      lastUsedAt: null,
      lastFile: null,
      lastSeason: null,
      totalOccurrences: 0,
    };
    all[entryId] = {
      importCount: prev.importCount + 1,
      firstUsedAt: prev.firstUsedAt ?? now,
      lastUsedAt: now,
      lastFile: opts.file ?? prev.lastFile,
      lastSeason: opts.season ?? prev.lastSeason,
      totalOccurrences: prev.totalOccurrences + 1,
    };
  }
  saveUsage(all);
}

export function clearDictionaryUsageStats(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USAGE_KEY);
  } catch {
    // ignore
  }
}
