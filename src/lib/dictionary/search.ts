import { getDictionaryIndexes } from "./registry";
import { normalizeDictionaryToken } from "./resolver";
import type {
  DictionaryEntry,
  DictionaryStatus,
  DictionarySubcategory,
  DictionaryImportContext,
} from "./types";

export function searchDictionary(query: string): DictionaryEntry[] {
  const normalized = normalizeDictionaryToken(query);
  if (!normalized) return [];

  const indexes = getDictionaryIndexes();
  const byIdMatches = [...indexes.byId.entries()]
    .filter(([id]) => normalizeDictionaryToken(id).includes(normalized))
    .map(([, entry]) => entry);
  const byKeyMatches = [...indexes.byKey.entries()]
    .filter(([key]) => normalizeDictionaryToken(key).includes(normalized))
    .map(([, entry]) => entry);
  const byAbbreviationMatches = [...indexes.byAbbreviation.entries()]
    .filter(([abbr]) => abbr.includes(normalized))
    .map(([, entry]) => entry);
  const byAliasMatches = [...indexes.byAlias.entries()]
    .filter(([alias]) => alias.includes(normalized))
    .map(([, entry]) => entry);

  const unique = new Map<string, DictionaryEntry>();
  for (const entry of [
    ...byIdMatches,
    ...byKeyMatches,
    ...byAbbreviationMatches,
    ...byAliasMatches,
  ]) {
    unique.set(entry.id, entry);
  }

  return [...unique.values()];
}

/** Filter a pre-loaded entry list by KB-specific criteria. */
export function filterDictionaryByKB(
  entries: DictionaryEntry[],
  opts: {
    status?: DictionaryStatus | "all" | "pending" | "ambiguous";
    subcategory?: DictionarySubcategory | "all";
    importContext?: DictionaryImportContext | "all";
  },
): DictionaryEntry[] {
  return entries.filter((entry) => {
    if (opts.status && opts.status !== "all") {
      if (opts.status === "pending") {
        if (entry.status && entry.status !== "auto_discovered") return false;
      } else if (opts.status === "ambiguous") {
        if (entry.aliases.length <= 1 || entry.status) return false;
      } else {
        if (entry.status !== opts.status) return false;
      }
    }
    if (opts.subcategory && opts.subcategory !== "all") {
      if (entry.subcategory !== opts.subcategory) return false;
    }
    if (opts.importContext && opts.importContext !== "all") {
      if (!entry.importContexts?.includes(opts.importContext)) return false;
    }
    return true;
  });
}
