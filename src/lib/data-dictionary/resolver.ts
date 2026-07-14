// Resolver genérico do Data Dictionary.
// Case-insensitive, ignora acentos, espaços, pontos e underscores.

import type { AttributeDef, DictionaryEntry, MetricDef, PositionDef, StatisticDef } from "./types";

export function normalizeKey(input: string): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/\\]+/g, "")
    .trim();
}

interface AliasIndex<T extends DictionaryEntry> {
  byId: Map<string, T>;
  byAlias: Map<string, T>;
}

function buildIndex<T extends DictionaryEntry>(
  entries: T[],
  extraAliases: (e: T) => string[],
): AliasIndex<T> {
  const byId = new Map<string, T>();
  const byAlias = new Map<string, T>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
    const all = [entry.id, ...extraAliases(entry), ...entry.aliases];
    for (const alias of all) {
      const k = normalizeKey(alias);
      if (!k) continue;
      // Primeira definição vence; catálogos não devem colidir.
      if (!byAlias.has(k)) byAlias.set(k, entry);
    }
  }
  return { byId, byAlias };
}

export function buildAttributeIndex(entries: AttributeDef[]) {
  return buildIndex<AttributeDef>(entries, (e) => [e.shortName, e.displayName, e.englishName]);
}

export function buildStatisticIndex(entries: StatisticDef[]) {
  return buildIndex<StatisticDef>(entries, (e) => [e.shortName, e.displayName, e.englishName]);
}

export function buildMetricIndex(entries: MetricDef[]) {
  return buildIndex<MetricDef>(entries, (e) => [e.shortName, e.displayName, e.englishName]);
}

export function buildPositionIndex(entries: PositionDef[]) {
  return buildIndex<PositionDef>(entries, (e) => [e.shortName, e.displayName, e.englishName]);
}
