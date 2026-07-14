import {
  listDictionaryEntries,
  replaceImportedDictionaryEntries,
  upsertDictionaryEntry,
} from "./registry";
import { validateDictionary } from "./validation";
import type { DictionaryEntry, DictionaryExportPayload } from "./types";

export type DictionaryImportMode = "add_new" | "update_existing" | "merge" | "replace_all";

export type DictionaryConflictField = "alias" | "key" | "id" | "abbreviation";

export interface DictionaryImportConflict {
  id: string;
  field: DictionaryConflictField;
  value: string;
  existingEntryId: string;
  incomingEntryId: string;
  message: string;
}

export type DictionaryConflictResolutionAction = "keep_current" | "use_new" | "manual";

export interface DictionaryConflictResolution {
  action: DictionaryConflictResolutionAction;
  manualValue?: string;
}

export type DictionaryConflictResolutionMap = Record<string, DictionaryConflictResolution>;

export interface DictionaryImportAnalysis {
  mode: DictionaryImportMode;
  incoming: DictionaryEntry[];
  current: DictionaryEntry[];
  finalEntries: DictionaryEntry[];
  created: DictionaryEntry[];
  updated: DictionaryEntry[];
  ignored: DictionaryEntry[];
  conflicts: DictionaryImportConflict[];
  aliasesAdded: number;
  duplicateIds: number;
  duplicateKeys: number;
  duplicateAliases: number;
  duplicateAbbreviations: number;
  validation: ReturnType<typeof validateDictionary>;
}

function normalizeEntry(entry: DictionaryEntry): DictionaryEntry {
  return upsertDictionaryEntry(entry, false);
}

function normalizePayload(payload: DictionaryExportPayload | DictionaryEntry[]): DictionaryEntry[] {
  const entries = Array.isArray(payload) ? payload : payload.entries;
  return entries.map((entry) => normalizeEntry(entry));
}

function byId(entries: DictionaryEntry[]): Map<string, DictionaryEntry> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function byKey(entries: DictionaryEntry[]): Map<string, DictionaryEntry> {
  return new Map(entries.map((entry) => [entry.key, entry]));
}

function buildConflict(
  field: DictionaryConflictField,
  value: string,
  existingEntryId: string,
  incomingEntryId: string,
): DictionaryImportConflict {
  return {
    id: `${field}:${value}:${existingEntryId}:${incomingEntryId}`,
    field,
    value,
    existingEntryId,
    incomingEntryId,
    message: `Conflito ${field}: ${value}`,
  };
}

function mergeEntry(
  base: DictionaryEntry,
  incoming: DictionaryEntry,
): { merged: DictionaryEntry; aliasesAdded: number } {
  const aliasSet = new Set(base.aliases);
  let aliasesAdded = 0;
  for (const alias of incoming.aliases) {
    if (!aliasSet.has(alias)) {
      aliasSet.add(alias);
      aliasesAdded += 1;
    }
  }

  const merged: DictionaryEntry = {
    ...base,
    // Keep identity/model fields stable and only fill missing info.
    name: base.name || incoming.name,
    abbreviation: base.abbreviation || incoming.abbreviation,
    aliases: [...aliasSet],
    description: base.description || incoming.description,
    category: base.category || incoming.category,
    importGroup: base.importGroup || incoming.importGroup,
    dataType: base.dataType || incoming.dataType,
    unit: base.unit || incoming.unit,
    source: base.source || incoming.source,
    originType: base.originType || incoming.originType,
    searchable: base.searchable ?? incoming.searchable,
    visible: base.visible ?? incoming.visible,
    deprecated: base.deprecated ?? incoming.deprecated,
  };

  return { merged, aliasesAdded };
}

export function analyzeDictionaryImport(
  payload: DictionaryExportPayload | DictionaryEntry[],
  mode: DictionaryImportMode = "merge",
  currentEntries: DictionaryEntry[] = listDictionaryEntries(),
): DictionaryImportAnalysis {
  const incoming = normalizePayload(payload);
  const current = [...currentEntries];

  const currentById = byId(current);
  const currentByKey = byKey(current);
  const incomingIdSeen = new Set<string>();
  const incomingKeySeen = new Set<string>();
  const incomingAliasSeen = new Set<string>();
  const incomingAbbrSeen = new Set<string>();

  let duplicateIds = 0;
  let duplicateKeys = 0;
  let duplicateAliases = 0;
  let duplicateAbbreviations = 0;

  for (const entry of incoming) {
    if (incomingIdSeen.has(entry.id)) duplicateIds += 1;
    incomingIdSeen.add(entry.id);
    if (incomingKeySeen.has(entry.key)) duplicateKeys += 1;
    incomingKeySeen.add(entry.key);

    for (const alias of entry.aliases) {
      const token = alias.toLowerCase();
      if (incomingAliasSeen.has(token)) duplicateAliases += 1;
      incomingAliasSeen.add(token);
    }

    if (entry.abbreviation) {
      const token = entry.abbreviation.toLowerCase();
      if (incomingAbbrSeen.has(token)) duplicateAbbreviations += 1;
      incomingAbbrSeen.add(token);
    }
  }

  const created: DictionaryEntry[] = [];
  const updated: DictionaryEntry[] = [];
  const ignored: DictionaryEntry[] = [];
  const conflicts: DictionaryImportConflict[] = [];
  let aliasesAdded = 0;

  let finalEntries: DictionaryEntry[];
  if (mode === "replace_all") {
    finalEntries = [...incoming];
    created.push(...incoming);
  } else {
    const finalById = new Map(current.map((entry) => [entry.id, { ...entry }]));

    for (const incomingEntry of incoming) {
      const byIncomingId = currentById.get(incomingEntry.id);
      const byIncomingKey = currentByKey.get(incomingEntry.key);
      const existing = byIncomingKey ?? byIncomingId;

      if (mode === "add_new") {
        if (existing) {
          ignored.push(incomingEntry);
          continue;
        }
        finalById.set(incomingEntry.id, incomingEntry);
        created.push(incomingEntry);
        continue;
      }

      if (mode === "update_existing") {
        if (!existing) {
          ignored.push(incomingEntry);
          continue;
        }
        finalById.set(existing.id, incomingEntry);
        updated.push(incomingEntry);
        continue;
      }

      // merge mode
      if (!existing) {
        finalById.set(incomingEntry.id, incomingEntry);
        created.push(incomingEntry);
        continue;
      }

      const currentEntry = finalById.get(existing.id) ?? existing;
      const mergedResult = mergeEntry(currentEntry, incomingEntry);
      aliasesAdded += mergedResult.aliasesAdded;

      if (incomingEntry.id !== existing.id) {
        conflicts.push(buildConflict("id", incomingEntry.id, existing.id, incomingEntry.id));
      }
      if (incomingEntry.key !== existing.key) {
        conflicts.push(buildConflict("key", incomingEntry.key, existing.id, incomingEntry.id));
      }

      if (incomingEntry.abbreviation && incomingEntry.abbreviation !== existing.abbreviation) {
        const conflictAbbrOwner = current.find(
          (entry) =>
            entry.id !== existing.id &&
            entry.abbreviation &&
            entry.abbreviation.toLowerCase() === incomingEntry.abbreviation?.toLowerCase(),
        );
        if (conflictAbbrOwner) {
          conflicts.push(
            buildConflict(
              "abbreviation",
              incomingEntry.abbreviation,
              conflictAbbrOwner.id,
              incomingEntry.id,
            ),
          );
        }
      }

      for (const alias of incomingEntry.aliases) {
        const conflictAliasOwner = current.find(
          (entry) =>
            entry.id !== existing.id &&
            entry.aliases.some((value) => value.toLowerCase() === alias.toLowerCase()),
        );
        if (conflictAliasOwner) {
          conflicts.push(buildConflict("alias", alias, conflictAliasOwner.id, incomingEntry.id));
        }
      }

      finalById.set(existing.id, mergedResult.merged);
      if (JSON.stringify(currentEntry) !== JSON.stringify(mergedResult.merged)) {
        updated.push(mergedResult.merged);
      } else {
        ignored.push(incomingEntry);
      }
    }

    finalEntries = [...finalById.values()];
  }

  const validation = validateDictionary(finalEntries);
  return {
    mode,
    incoming,
    current,
    finalEntries,
    created,
    updated,
    ignored,
    conflicts,
    aliasesAdded,
    duplicateIds,
    duplicateKeys,
    duplicateAliases,
    duplicateAbbreviations,
    validation,
  };
}

function resolveConflictPlan(
  analysis: DictionaryImportAnalysis,
  resolutions: DictionaryConflictResolutionMap = {},
): DictionaryEntry[] {
  const currentById = byId(analysis.current);
  const incomingById = byId(analysis.incoming);
  const finalById = byId(analysis.finalEntries);

  for (const conflict of analysis.conflicts) {
    const decision = resolutions[conflict.id] ?? { action: "keep_current" as const };
    const existingEntry =
      finalById.get(conflict.existingEntryId) ?? currentById.get(conflict.existingEntryId);
    const incomingEntry = incomingById.get(conflict.incomingEntryId);
    if (!existingEntry || !incomingEntry) continue;

    if (decision.action === "keep_current") continue;

    if (conflict.field === "alias") {
      const incomingTarget = finalById.get(incomingEntry.id) ?? existingEntry;
      const aliasValue =
        decision.action === "manual"
          ? decision.manualValue?.trim() || conflict.value
          : conflict.value;
      if (!aliasValue) continue;

      const nextExisting = {
        ...existingEntry,
        aliases: existingEntry.aliases.filter(
          (alias) => alias.toLowerCase() !== conflict.value.toLowerCase(),
        ),
      };
      const nextIncoming = {
        ...incomingTarget,
        aliases: [...new Set([...incomingTarget.aliases, aliasValue])],
      };
      finalById.set(existingEntry.id, nextExisting);
      finalById.set(nextIncoming.id, nextIncoming);
      continue;
    }

    if (conflict.field === "abbreviation") {
      const incomingTarget = finalById.get(incomingEntry.id) ?? existingEntry;
      const value =
        decision.action === "manual" ? decision.manualValue?.trim() : incomingEntry.abbreviation;
      if (!value) continue;
      finalById.set(existingEntry.id, { ...existingEntry, abbreviation: undefined });
      finalById.set(incomingTarget.id, { ...incomingTarget, abbreviation: value });
      continue;
    }

    if (conflict.field === "key") {
      const value = decision.action === "manual" ? decision.manualValue?.trim() : incomingEntry.key;
      if (!value) continue;
      const incomingTarget = finalById.get(incomingEntry.id) ?? incomingEntry;
      finalById.set(incomingTarget.id, { ...incomingTarget, key: value });
      continue;
    }

    if (conflict.field === "id") {
      const value = decision.action === "manual" ? decision.manualValue?.trim() : incomingEntry.id;
      if (!value) continue;
      const current = finalById.get(incomingEntry.id) ?? incomingEntry;
      finalById.delete(incomingEntry.id);
      finalById.set(value, { ...current, id: value });
    }
  }

  return [...finalById.values()].map((entry) => normalizeEntry(entry));
}

export function applyDictionaryImport(
  payload: DictionaryExportPayload | DictionaryEntry[],
  options?: {
    mode?: DictionaryImportMode;
    resolutions?: DictionaryConflictResolutionMap;
  },
) {
  const mode = options?.mode ?? "merge";
  const analysis = analyzeDictionaryImport(payload, mode);
  const resolvedEntries = resolveConflictPlan(analysis, options?.resolutions);
  const validation = validateDictionary(resolvedEntries);

  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings,
      imported: 0,
      analysis,
    };
  }

  replaceImportedDictionaryEntries(resolvedEntries);

  return {
    ok: true,
    errors: validation.errors,
    warnings: validation.warnings,
    imported: resolvedEntries.length,
    analysis,
  };
}

export function exportDictionary(
  entries: DictionaryEntry[] = listDictionaryEntries(),
): DictionaryExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: [...entries],
  };
}

export function importDictionary(payload: DictionaryExportPayload | DictionaryEntry[]) {
  return applyDictionaryImport(payload, { mode: "replace_all" });
}
