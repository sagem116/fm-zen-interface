export type DictionaryEntity = "player" | "club" | "coach" | "competition";

export type DictionaryDomain =
  | "profile"
  | "statistics"
  | "classification"
  | "finance"
  | "history"
  | "contract"
  | "context"
  | "derived";

export type DictionaryCategory =
  | "identifier"
  | "profile_field"
  | "attribute"
  | "metric"
  | "rating"
  | "context"
  | "modifier"
  | "derived";

export type DictionaryImportGroup =
  | "player_profile"
  | "player_statistics"
  | "club_information"
  | "club_classification"
  | "coach_information"
  | "competition_information";

export type DictionaryDataType = "number" | "string" | "boolean" | "date";

export type DictionaryOriginType = "football_manager" | "calculated" | "manual";

export interface DictionaryEntry {
  id: string;
  key: string;
  name: string;
  abbreviation?: string;
  aliases: string[];
  entity: DictionaryEntity;
  domain: DictionaryDomain;
  category: DictionaryCategory;
  importGroup: DictionaryImportGroup;
  dataType: DictionaryDataType;
  unit?: string;
  description?: string;
  source?: string;
  originType?: DictionaryOriginType;
  searchable: boolean;
  visible: boolean;
  deprecated: boolean;
  /* v2.0 Knowledge Base — optional fields */
  status?: DictionaryStatus;
  originSource?: DictionaryOriginSource;
  subcategory?: DictionarySubcategory;
  importContexts?: DictionaryImportContext[];
  examples?: string[];
  similarIds?: string[];
}

export interface DictionaryEntryDraft extends Omit<DictionaryEntry, "id"> {
  id?: string;
}

export interface DictionaryValidationIssue {
  code:
    | "duplicate_id"
    | "duplicate_key"
    | "duplicate_alias"
    | "duplicate_abbreviation"
    | "invalid_entity"
    | "invalid_domain"
    | "invalid_category"
    | "invalid_import_group"
    | "invalid_data_type"
    | "invalid_origin_type";
  message: string;
  entryId?: string;
  value?: string;
}

export interface DictionaryValidationResult {
  valid: boolean;
  errors: DictionaryValidationIssue[];
  warnings: DictionaryValidationIssue[];
}

export interface DictionaryStats {
  totalEntries: number;
  totalAttributes: number;
  totalMetrics: number;
  totalRatings: number;
  totalContexts: number;
  totalClubs: number;
  totalPlayers: number;
  totalCoaches: number;
  totalCompetitions: number;
  totalAliases: number;
  unusedEntries: number;
  deprecatedEntries: number;
}

export interface DictionaryExportPayload {
  version: 1;
  exportedAt: string;
  entries: DictionaryEntry[];
}

/* ------------------------------------------------------------------ */
/* Dictionary v2.0 — Knowledge Base types                               */
/* ------------------------------------------------------------------ */

export type DictionaryStatus =
  | "official"
  | "auto_discovered"
  | "confirmed"
  | "ignored"
  | "obsolete";

export type DictionaryOriginSource =
  | "manual"
  | "auto_discovered"
  | "previous_import"
  | "system";

export type DictionaryImportContext =
  | "import_players"
  | "import_competitions"
  | "import_coaches"
  | "import_clubs"
  | "import_countries"
  | "import_international";

export type DictionarySubcategory =
  | "technical"
  | "mental"
  | "physical"
  | "goalkeeper"
  | "passing"
  | "shooting"
  | "defending"
  | "possession"
  | "goalkeeping"
  | "discipline"
  | "creation"
  | "progression"
  | "physical_metric";

export interface DictionaryUsageStats {
  importCount: number;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
  lastFile: string | null;
  lastSeason: string | null;
  totalOccurrences: number;
}

export type DictionaryChangelogEventType =
  | "created"
  | "alias_added"
  | "alias_removed"
  | "category_changed"
  | "name_changed"
  | "status_changed"
  | "subcategory_changed"
  | "description_changed"
  | "deprecated";

export interface DictionaryChangelogEntry {
  id: string;
  at: string;
  eventType: DictionaryChangelogEventType;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

export interface DictionarySmartSuggestion {
  suggestedId: string;
  confidence: number;
  reason: string;
  similarIds: string[];
  category?: DictionaryCategory;
  subcategory?: DictionarySubcategory;
  entity?: DictionaryEntity;
  context?: DictionaryImportContext;
  dataType?: DictionaryDataType;
  unit?: string;
}

export interface DictionaryStatsV2 extends DictionaryStats {
  totalOfficial: number;
  totalAutoDiscovered: number;
  totalConfirmed: number;
  totalIgnored: number;
  totalObsolete: number;
  totalPending: number;
  totalAmbiguous: number;
  byStatus: Partial<Record<DictionaryStatus, number>>;
  bySubcategory: Partial<Record<DictionarySubcategory, number>>;
}
