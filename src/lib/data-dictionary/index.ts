// Data Dictionary — API pública.
// Módulo isolado. Não altera nenhum motor existente.

export type {
  AttributeDef,
  AttributeCategory,
  MetricDef,
  MetricCategory,
  StatisticDef,
  StatisticCategory,
  PositionDef,
  PositionGroup,
  ContextDef,
  ModifierDef,
  DictionaryEntry,
  DictionaryEntryBase,
  DictionaryCatalogDraft,
  DictionaryCatalogEntry,
  DictionaryCategory,
  DictionaryEntityKind,
  EntryKind,
  OriginType,
  ResolvedEntry,
} from "./types";

export { ATTRIBUTES } from "./attributes";
export { METRICS } from "./metrics";
export { STATISTICS } from "./statistics";
export { POSITIONS } from "./positions";

export { normalizeKey } from "./resolver";

export {
  listAttributes,
  getAttribute,
  resolveAttribute,
  resolveAttributeId,
  listMetrics,
  getMetric,
  resolveMetric,
  resolveMetricId,
  listStatistics,
  getStatistic,
  resolveStatistic,
  resolveStatisticId,
  listPositions,
  getPosition,
  resolvePosition,
  resolvePositionId,
  normalizeColumnName,
  resolveColumnName,
  listDictionaryEntries,
  listCustomDictionaryEntries,
  resolveDictionaryColumn,
  upsertCustomDictionaryEntry,
} from "./registry";
