/**
 * Dictionary v2 — Change Changelog
 *
 * Records per-entry mutation events (field created, alias added/removed,
 * category changed, etc.). Stored in localStorage. Read-only from engines.
 */
import type { DictionaryChangelogEntry } from "./types";

const CHANGELOG_KEY = "fm-dictionary-changelog-v1";
const MAX_PER_ENTRY = 200;

function loadChangelog(): Record<string, DictionaryChangelogEntry[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHANGELOG_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DictionaryChangelogEntry[]>;
  } catch {
    return {};
  }
}

function saveChangelog(data: Record<string, DictionaryChangelogEntry[]>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHANGELOG_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function getDictionaryChangelog(entryId: string): DictionaryChangelogEntry[] {
  return loadChangelog()[entryId] ?? [];
}

export function getAllDictionaryChangelog(): Record<string, DictionaryChangelogEntry[]> {
  return loadChangelog();
}

export function appendDictionaryChangelog(
  entryId: string,
  event: Omit<DictionaryChangelogEntry, "id" | "at">,
): void {
  const all = loadChangelog();
  const prev = all[entryId] ?? [];
  const entry: DictionaryChangelogEntry = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
  };
  // Prepend new events; keep the most recent MAX_PER_ENTRY
  all[entryId] = [entry, ...prev].slice(0, MAX_PER_ENTRY);
  saveChangelog(all);
}

export function clearDictionaryChangelog(entryId?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!entryId) {
      window.localStorage.removeItem(CHANGELOG_KEY);
      return;
    }
    const all = loadChangelog();
    delete all[entryId];
    saveChangelog(all);
  } catch {
    // ignore
  }
}
