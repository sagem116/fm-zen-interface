import { listDictionaryEntries } from "./registry";
import { normalizeDictionaryToken } from "./resolver";
import type {
  DictionaryCategory,
  DictionaryDataType,
  DictionaryDomain,
  DictionaryEntry,
  DictionaryEntity,
  DictionaryImportGroup,
  DictionaryOriginType,
  DictionaryValidationIssue,
  DictionaryValidationResult,
} from "./types";

const VALID_ENTITIES: DictionaryEntity[] = ["player", "club", "coach", "competition"];
const VALID_DOMAINS: DictionaryDomain[] = [
  "profile",
  "statistics",
  "classification",
  "finance",
  "history",
  "contract",
  "context",
  "derived",
];
const VALID_CATEGORIES: DictionaryCategory[] = [
  "identifier",
  "profile_field",
  "attribute",
  "metric",
  "rating",
  "context",
  "modifier",
  "derived",
];
const VALID_IMPORT_GROUPS: DictionaryImportGroup[] = [
  "player_profile",
  "player_statistics",
  "club_information",
  "club_classification",
  "coach_information",
  "competition_information",
];
const VALID_DATA_TYPES: DictionaryDataType[] = ["number", "string", "boolean", "date"];
const VALID_ORIGIN_TYPES: DictionaryOriginType[] = ["football_manager", "calculated", "manual"];

function duplicateIssue(
  code: DictionaryValidationIssue["code"],
  fieldLabel: string,
  value: string,
  entryId: string,
): DictionaryValidationIssue {
  return {
    code,
    message: `Duplicate ${fieldLabel} detected: ${value}`,
    value,
    entryId,
  };
}

function scopedEntityToken(entry: DictionaryEntry, value: string): string | null {
  const normalized = normalizeDictionaryToken(value);
  if (!normalized) return null;
  return `${entry.entity}::${normalized}`;
}

function pushUnique(
  map: Map<string, string>,
  value: string,
  entry: DictionaryEntry,
  code: DictionaryValidationIssue["code"],
  fieldLabel: string,
  into: DictionaryValidationIssue[],
  scope: "global" | "entity" = "global",
) {
  const normalized = normalizeDictionaryToken(value);
  if (!normalized) return;

  const token = scope === "entity" ? scopedEntityToken(entry, value) : normalized;
  if (!token) return;

  const firstEntryId = map.get(token);
  if (!firstEntryId) {
    map.set(token, entry.id);
    return;
  }
  into.push(duplicateIssue(code, fieldLabel, value, entry.id));
}

export function validateDictionary(entries = listDictionaryEntries()): DictionaryValidationResult {
  const errors: DictionaryValidationIssue[] = [];
  const warnings: DictionaryValidationIssue[] = [];

  const ids = new Map<string, string>();
  const keys = new Map<string, string>();
  const aliases = new Map<string, string>();
  const abbreviations = new Map<string, string>();

  for (const entry of entries) {
    // IDs/keys/aliases are entity-scoped to allow valid cross-entity reuse
    // (e.g. player.country and club.country).
    pushUnique(ids, entry.id, entry, "duplicate_id", "id", errors, "entity");
    pushUnique(keys, entry.key, entry, "duplicate_key", "key", errors, "entity");

    if (entry.abbreviation) {
      pushUnique(
        abbreviations,
        entry.abbreviation,
        entry,
        "duplicate_abbreviation",
        "abbreviation",
        warnings,
      );
    }

    for (const alias of entry.aliases) {
      pushUnique(aliases, alias, entry, "duplicate_alias", "alias", warnings, "entity");
    }

    if (!VALID_ENTITIES.includes(entry.entity)) {
      errors.push({
        code: "invalid_entity",
        message: `Invalid entity: ${entry.entity}`,
        entryId: entry.id,
        value: String(entry.entity),
      });
    }

    if (!VALID_DOMAINS.includes(entry.domain)) {
      errors.push({
        code: "invalid_domain",
        message: `Invalid domain: ${entry.domain}`,
        entryId: entry.id,
        value: String(entry.domain),
      });
    }

    if (!VALID_CATEGORIES.includes(entry.category)) {
      errors.push({
        code: "invalid_category",
        message: `Invalid category: ${entry.category}`,
        entryId: entry.id,
        value: String(entry.category),
      });
    }

    if (!VALID_IMPORT_GROUPS.includes(entry.importGroup)) {
      errors.push({
        code: "invalid_import_group",
        message: `Invalid importGroup: ${entry.importGroup}`,
        entryId: entry.id,
        value: String(entry.importGroup),
      });
    }

    if (!VALID_DATA_TYPES.includes(entry.dataType)) {
      errors.push({
        code: "invalid_data_type",
        message: `Invalid dataType: ${entry.dataType}`,
        entryId: entry.id,
        value: String(entry.dataType),
      });
    }

    if (entry.originType && !VALID_ORIGIN_TYPES.includes(entry.originType)) {
      errors.push({
        code: "invalid_origin_type",
        message: `Invalid originType: ${entry.originType}`,
        entryId: entry.id,
        value: String(entry.originType),
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
