import type { DictionaryEntry } from "./types";
import { getDictionaryIndexes } from "./registry";

export function normalizeDictionaryToken(input: string): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/\\]+/g, "")
    .trim();
}

export function resolveDictionaryColumn(nameOrAlias: string): DictionaryEntry | null {
  const normalized = normalizeDictionaryToken(nameOrAlias);
  if (!normalized) return null;
  return getDictionaryIndexes().byAlias.get(normalized) ?? null;
}
