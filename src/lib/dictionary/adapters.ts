import type {
  DictionaryCategory,
  DictionaryCatalogDraft,
  DictionaryCatalogEntry,
  DictionaryEntityKind,
} from "../data-dictionary/types";
import type {
  DictionaryDataType,
  DictionaryDomain,
  DictionaryEntry,
  DictionaryEntryDraft,
  DictionaryEntity,
  DictionaryImportGroup,
} from "./types";

function toLegacyEntity(entity: DictionaryEntity): DictionaryEntityKind {
  if (entity === "player") return "player";
  if (entity === "club") return "club";
  if (entity === "coach") return "coach";
  return "competition";
}

function fromLegacyEntity(entity: DictionaryEntityKind): DictionaryEntity {
  if (entity === "player" || entity === "club" || entity === "coach" || entity === "competition")
    return entity;
  return "player";
}

function toLegacyCategory(category: DictionaryEntry["category"]): DictionaryCategory {
  if (category === "identifier") return "identifiers";
  if (category === "profile_field") return "profile_fields";
  if (category === "attribute") return "attributes";
  if (category === "metric") return "metrics";
  if (category === "rating") return "ratings";
  if (category === "context") return "contexts";
  if (category === "modifier") return "modifiers";
  return "derived_fields";
}

function fromLegacyCategory(category: DictionaryCategory): DictionaryEntry["category"] {
  if (category === "identifiers") return "identifier";
  if (category === "profile_fields") return "profile_field";
  if (category === "attributes") return "attribute";
  if (category === "metrics" || category === "statistics") return "metric";
  if (category === "ratings") return "rating";
  if (category === "contexts" || category === "positions") return "context";
  if (category === "modifiers") return "modifier";
  return "derived";
}

function legacyIdFromNew(entry: DictionaryEntry): string {
  const chunks = entry.id.split(".");
  if (chunks.length >= 3) {
    const [entity, category, ...rest] = chunks;
    const suffix = rest.join(".");
    if (entity === "player" && category === "attribute") return `attribute.${suffix}`;
    if (entity === "player" && category === "metric") {
      if (suffix.startsWith("stat_")) return `statistic.${suffix.slice(5)}`;
      return `metric.${suffix}`;
    }
    if (entity === "player" && category === "context" && suffix.startsWith("position_")) {
      return `position.${suffix.slice(9)}`;
    }
    if (entity === "player" && category === "identifier") return `identifier.${suffix}`;
    if (entity === "player" && category === "profile") return `profile.${suffix}`;
    if (entity === "player" && category === "context") return `context.${suffix}`;
    if (entity === "player" && category === "rating") return `rating.${suffix}`;
  }

  const fallback = entry.aliases.find((alias) =>
    /^(attribute|metric|statistic|position|identifier|profile|context|rating)\./.test(alias),
  );
  return fallback ?? entry.id;
}

function inferDomain(category: DictionaryEntry["category"]): DictionaryDomain {
  if (category === "attribute" || category === "profile_field" || category === "identifier")
    return "profile";
  if (category === "metric") return "statistics";
  if (category === "rating") return "classification";
  if (category === "context") return "context";
  if (category === "derived") return "derived";
  return "profile";
}

function inferImportGroup(
  entity: DictionaryEntity,
  category: DictionaryEntry["category"],
): DictionaryImportGroup {
  if (entity === "player") return category === "metric" ? "player_statistics" : "player_profile";
  if (entity === "club") return category === "rating" ? "club_classification" : "club_information";
  if (entity === "coach") return "coach_information";
  return "competition_information";
}

function inferDataType(category: DictionaryEntry["category"]): DictionaryDataType {
  if (category === "attribute" || category === "metric" || category === "rating") return "number";
  return "string";
}

export function toLegacyCatalogEntry(entry: DictionaryEntry): DictionaryCatalogEntry {
  return {
    id: legacyIdFromNew(entry),
    name: entry.name,
    abbreviation: entry.abbreviation ?? entry.name,
    category: toLegacyCategory(entry.category),
    entityKind: toLegacyEntity(entry.entity),
    description: entry.description,
    unit: entry.unit ?? null,
    source: entry.source,
    originType: entry.originType === "calculated" ? "derived" : "raw",
    discoverable: entry.visible,
    aliases: [...entry.aliases],
  };
}

export function fromLegacyCatalogDraft(draft: DictionaryCatalogDraft): DictionaryEntryDraft {
  const entity = fromLegacyEntity(draft.entityKind);
  const category = fromLegacyCategory(draft.category);

  return {
    id: draft.id,
    key: draft.id?.split(".").pop() || draft.name,
    name: draft.name,
    abbreviation: draft.abbreviation,
    aliases: draft.aliases,
    entity,
    domain: inferDomain(category),
    category,
    importGroup: inferImportGroup(entity, category),
    dataType: inferDataType(category),
    unit: draft.unit ?? undefined,
    description: draft.description,
    source: draft.source,
    originType: draft.originType === "derived" ? "calculated" : "manual",
    searchable: true,
    visible: draft.discoverable ?? true,
    deprecated: false,
  };
}
