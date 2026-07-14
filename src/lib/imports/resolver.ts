import {
  getDictionaryEntry,
  listDictionaryEntries,
  normalizeDictionaryToken,
  resolveDictionaryColumn,
} from "@/lib/dictionary";
import type { DictionaryEntry } from "@/lib/dictionary";
import type { PipelineDefinition, ResolvedHeader, WorkbookData } from "./types";

function findAliasMatches(header: string): DictionaryEntry[] {
  const token = normalizeDictionaryToken(header);
  if (!token) return [];

  const matches: DictionaryEntry[] = [];
  for (const entry of listDictionaryEntries()) {
    const haystack = [entry.id, entry.key, entry.name, entry.abbreviation ?? "", ...entry.aliases]
      .map((part) => normalizeDictionaryToken(part))
      .filter(Boolean);
    if (haystack.includes(token)) {
      matches.push(entry);
    }
  }
  return matches;
}

function inferAliasUsed(header: string, entry: DictionaryEntry | null): string | null {
  if (!entry) return null;
  const normalizedHeader = normalizeDictionaryToken(header);
  if (!normalizedHeader) return null;

  const aliases = [entry.id, entry.key, entry.name, entry.abbreviation ?? "", ...entry.aliases];
  const hit = aliases.find((alias) => normalizeDictionaryToken(alias) === normalizedHeader);
  return hit ?? null;
}

export function resolveHeaders(
  workbook: WorkbookData,
  definition: PipelineDefinition,
  manualMappings: Record<string, string> = {},
): ResolvedHeader[] {
  const resolved: ResolvedHeader[] = [];

  for (const sheet of workbook.sheets) {
    for (let index = 0; index < sheet.headers.length; index++) {
      const originalHeader = sheet.headers[index] ?? "";
      if (!originalHeader) continue;

      const manualId =
        manualMappings[originalHeader] ?? manualMappings[normalizeDictionaryToken(originalHeader)];
      const manualEntry = manualId ? getDictionaryEntry(manualId) : null;
      const exact = resolveDictionaryColumn(originalHeader);
      const candidates = findAliasMatches(originalHeader).filter((entry) => {
        return entry.entity === definition.entity;
      });

      let dictionaryEntry = manualEntry ?? exact;
      let resolutionMode: ResolvedHeader["resolutionMode"] = manualEntry
        ? "manual"
        : exact
          ? "automatic"
          : "unknown";
      if (dictionaryEntry && dictionaryEntry.entity !== definition.entity) {
        dictionaryEntry = null;
        resolutionMode = "unknown";
      }

      if (!dictionaryEntry && candidates.length === 1) {
        dictionaryEntry = candidates[0];
        resolutionMode = "automatic";
      }

      resolved.push({
        originalHeader,
        sheet: sheet.name,
        columnIndex: index,
        dictionaryEntry,
        possibleMatches: candidates,
        aliasUsed: manualEntry ? null : inferAliasUsed(originalHeader, dictionaryEntry),
        resolutionMode,
      });
    }
  }

  return resolved;
}
