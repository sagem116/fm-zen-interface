import type {
  DictionaryCategory,
  DictionaryEntry,
  DictionaryEntity,
  DictionaryImportGroup,
  DictionaryDomain,
} from "./types";
import { normalizeDictionaryToken } from "./resolver";

export interface DictionaryIndexes {
  byId: Map<string, DictionaryEntry>;
  byKey: Map<string, DictionaryEntry>;
  byAbbreviation: Map<string, DictionaryEntry>;
  byAlias: Map<string, DictionaryEntry>;
  byEntity: Map<DictionaryEntity, DictionaryEntry[]>;
  byDomain: Map<DictionaryDomain, DictionaryEntry[]>;
  byCategory: Map<DictionaryCategory, DictionaryEntry[]>;
  byImportGroup: Map<DictionaryImportGroup, DictionaryEntry[]>;
}

function pushGrouped<K extends string>(
  map: Map<K, DictionaryEntry[]>,
  key: K,
  entry: DictionaryEntry,
) {
  const current = map.get(key);
  if (current) {
    current.push(entry);
    return;
  }
  map.set(key, [entry]);
}

export function buildDictionaryIndexes(entries: DictionaryEntry[]): DictionaryIndexes {
  const byId = new Map<string, DictionaryEntry>();
  const byKey = new Map<string, DictionaryEntry>();
  const byAbbreviation = new Map<string, DictionaryEntry>();
  const byAlias = new Map<string, DictionaryEntry>();
  const byEntity = new Map<DictionaryEntity, DictionaryEntry[]>();
  const byDomain = new Map<DictionaryDomain, DictionaryEntry[]>();
  const byCategory = new Map<DictionaryCategory, DictionaryEntry[]>();
  const byImportGroup = new Map<DictionaryImportGroup, DictionaryEntry[]>();

  for (const entry of entries) {
    byId.set(entry.id, entry);
    byKey.set(entry.key, entry);

    if (entry.abbreviation) {
      const normalizedAbbreviation = normalizeDictionaryToken(entry.abbreviation);
      if (normalizedAbbreviation && !byAbbreviation.has(normalizedAbbreviation)) {
        byAbbreviation.set(normalizedAbbreviation, entry);
      }
    }

    const aliases = [entry.id, entry.key, entry.name, entry.abbreviation ?? "", ...entry.aliases];
    for (const alias of aliases) {
      const normalizedAlias = normalizeDictionaryToken(alias);
      if (!normalizedAlias || byAlias.has(normalizedAlias)) continue;
      byAlias.set(normalizedAlias, entry);
    }

    pushGrouped(byEntity, entry.entity, entry);
    pushGrouped(byDomain, entry.domain, entry);
    pushGrouped(byCategory, entry.category, entry);
    pushGrouped(byImportGroup, entry.importGroup, entry);
  }

  return {
    byId,
    byKey,
    byAbbreviation,
    byAlias,
    byEntity,
    byDomain,
    byCategory,
    byImportGroup,
  };
}
