export type {
  DictionaryCategory,
  DictionaryDataType,
  DictionaryDomain,
  DictionaryEntry,
  DictionaryEntryDraft,
  DictionaryEntity,
  DictionaryExportPayload,
  DictionaryImportGroup,
  DictionaryOriginType,
  DictionaryStats,
  DictionaryValidationIssue,
  DictionaryValidationResult,
  // v2.0 Knowledge Base
  DictionaryStatus,
  DictionaryOriginSource,
  DictionaryImportContext,
  DictionarySubcategory,
  DictionaryUsageStats,
  DictionaryChangelogEventType,
  DictionaryChangelogEntry,
  DictionarySmartSuggestion,
  DictionaryStatsV2,
} from "./types";

export {
  listDictionaryEntries,
  getDictionaryEntry,
  listByEntity,
  listByDomain,
  listByCategory,
  listByImportGroup,
  listAliases,
  listCustomDictionaryEntries,
  upsertDictionaryEntry,
} from "./registry";

export { normalizeDictionaryToken, resolveDictionaryColumn } from "./resolver";
export { searchDictionary, filterDictionaryByKB } from "./search";
export { validateDictionary } from "./validation";
export { getDictionaryStats, getDictionaryStatsV2 } from "./stats";
export {
  exportDictionary,
  importDictionary,
  analyzeDictionaryImport,
  applyDictionaryImport,
  type DictionaryImportMode,
  type DictionaryImportConflict,
  type DictionaryConflictResolution,
  type DictionaryConflictResolutionMap,
  type DictionaryImportAnalysis,
} from "./import-export";
// v2.0 Knowledge Base
export {
  getDictionaryUsageStats,
  getAllDictionaryUsageStats,
  updateDictionaryUsageStats,
  batchUpdateDictionaryUsageStats,
  clearDictionaryUsageStats,
} from "./usage";
export {
  getDictionaryChangelog,
  getAllDictionaryChangelog,
  appendDictionaryChangelog,
  clearDictionaryChangelog,
} from "./changelog";
export {
  suggestDictionaryMapping,
  inferSubcategory,
  detectDictionaryUnit,
  detectDictionaryDataType,
  detectDictionaryCategory,
  discoverImportContexts,
  findSimilarDictionaryEntries,
} from "./knowledge-base";
