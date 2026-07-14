import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  Download,
  FileJson,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  Eye,
  Lightbulb,
  Activity,
  Clock,
  Tag,
  History,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Info,
} from "lucide-react";
import {
  analyzeDictionaryImport,
  applyDictionaryImport,
  exportDictionary,
  getDictionaryEntry,
  getDictionaryStats,
  getDictionaryStatsV2,
  listCustomDictionaryEntries,
  listDictionaryEntries,
  normalizeDictionaryToken,
  resolveDictionaryColumn,
  searchDictionary,
  filterDictionaryByKB,
  upsertDictionaryEntry,
  validateDictionary,
  getDictionaryUsageStats,
  getDictionaryChangelog,
  appendDictionaryChangelog,
  suggestDictionaryMapping,
  inferSubcategory,
  findSimilarDictionaryEntries,
  type DictionaryCategory,
  type DictionaryConflictResolution,
  type DictionaryConflictResolutionMap,
  type DictionaryDataType,
  type DictionaryDomain,
  type DictionaryEntry,
  type DictionaryEntryDraft,
  type DictionaryEntity,
  type DictionaryExportPayload,
  type DictionaryImportGroup,
  type DictionaryOriginType,
  type DictionaryValidationIssue,
  type DictionaryImportAnalysis,
  type DictionaryImportMode,
  type DictionaryStatus,
  type DictionarySubcategory,
  type DictionaryImportContext,
  type DictionaryUsageStats,
  type DictionaryChangelogEntry,
  type DictionarySmartSuggestion,
} from "@/lib/dictionary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

export const Route = createFileRoute("/dictionary")({
  head: () => ({
    meta: [
      { title: "Dictionary - FM World Rankings" },
      { name: "description", content: "Gestao completa do Data Dictionary." },
    ],
  }),
  component: DictionaryPage,
});

type SortDir = "asc" | "desc";
type SortKey =
  "name" | "key" | "entity" | "domain" | "category" | "importGroup" | "aliases" | "deprecated";
type Tri = "all" | "yes" | "no";
type StatusFilter = "all" | "active" | "deprecated";
type DomainFilter = "all" | "attribute" | "metric" | "rating" | "context" | "general";
type ModalMode = "create" | "edit" | "duplicate";
type KbStatusFilter = "all" | DictionaryStatus | "pending" | "ambiguous";

const ENTITY_OPTIONS: { value: "all" | DictionaryEntity; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "player", label: "Jogadores" },
  { value: "club", label: "Clubes" },
  { value: "coach", label: "Treinadores" },
  { value: "competition", label: "Competicoes" },
];

const DOMAIN_OPTIONS: { value: "all" | DictionaryDomain; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "profile", label: "Profile" },
  { value: "statistics", label: "Statistics" },
  { value: "classification", label: "Classification" },
  { value: "finance", label: "Finance" },
  { value: "history", label: "History" },
  { value: "contract", label: "Contract" },
  { value: "context", label: "Context" },
  { value: "derived", label: "Derived" },
];

const ORIGIN_OPTIONS: { value: "all" | DictionaryOriginType | "system"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "football_manager", label: "Football Manager" },
  { value: "calculated", label: "Calculado" },
  { value: "system", label: "Sistema" },
  { value: "manual", label: "Manual" },
];

const CATEGORY_OPTIONS: DictionaryCategory[] = [
  "identifier",
  "profile_field",
  "attribute",
  "metric",
  "rating",
  "context",
  "modifier",
  "derived",
];

const IMPORT_GROUP_OPTIONS: DictionaryImportGroup[] = [
  "player_profile",
  "player_statistics",
  "club_information",
  "club_classification",
  "coach_information",
  "competition_information",
];

const DATA_TYPE_OPTIONS: DictionaryDataType[] = ["number", "string", "boolean", "date"];
const ORIGIN_TYPE_OPTIONS: DictionaryOriginType[] = ["football_manager", "calculated", "manual"];

interface EntryFormState {
  id?: string;
  name: string;
  key: string;
  abbreviation: string;
  aliases: string[];
  description: string;
  entity: DictionaryEntity;
  domain: DictionaryDomain;
  category: DictionaryCategory;
  importGroup: DictionaryImportGroup;
  source: string;
  originType: DictionaryOriginType;
  unit: string;
  dataType: DictionaryDataType;
  searchable: boolean;
  visible: boolean;
  deprecated: boolean;
  // v2.0 KB fields
  status: DictionaryStatus | "";
  subcategory: DictionarySubcategory | "";
  importContexts: DictionaryImportContext[];
  examples: string[];
}

interface ImportPreview {
  fileName: string;
  fileDateIso: string;
  payload: DictionaryExportPayload | DictionaryEntry[];
  mode: DictionaryImportMode;
  analysis: DictionaryImportAnalysis;
  resolvedEntries: DictionaryEntry[];
  currentEntries: DictionaryEntry[];
  afterEntries: DictionaryEntry[];
  conflictResolutions: DictionaryConflictResolutionMap;
  newAliases: string[];
  invalidEntries: DictionaryEntry[];
  entitiesCount: number;
  attributesCount: number;
  metricsCount: number;
  aliasesCount: number;
  validationErrors: DictionaryValidationIssue[];
  validationWarnings: DictionaryValidationIssue[];
}

type DictionaryOperationType = "Import JSON" | "Export JSON" | "Atualização" | "Reposição";
type DictionaryOperationStatus = "OK" | "Avisos" | "Erros";

interface DictionaryHistoryRecord {
  id: string;
  atIso: string;
  user: string | null;
  type: DictionaryOperationType;
  mode?: DictionaryImportMode;
  fileName: string | null;
  added: string[];
  updated: string[];
  ignored: string[];
  removed: string[];
  aliasesAdded?: number;
  conflicts?: number;
  warnings: string[];
  errors: string[];
  status: DictionaryOperationStatus;
}

const IMPORT_MODE_OPTIONS: { value: DictionaryImportMode; label: string }[] = [
  { value: "add_new", label: "Adicionar apenas novas" },
  { value: "update_existing", label: "Atualizar existentes" },
  { value: "merge", label: "Merge Inteligente" },
  { value: "replace_all", label: "Substituir tudo" },
];

const HISTORY_STORAGE_KEY = "fm-dictionary-history-v1";

function getOperationStatus(warnings: string[], errors: string[]): DictionaryOperationStatus {
  if (errors.length > 0) return "Erros";
  if (warnings.length > 0) return "Avisos";
  return "OK";
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-PT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function loadHistory(): DictionaryHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DictionaryHistoryRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveHistory(records: DictionaryHistoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage failures
  }
}

function toTitle(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function domainBucket(entry: DictionaryEntry): Exclude<DomainFilter, "all"> {
  if (entry.category === "attribute") return "attribute";
  if (entry.category === "metric") return "metric";
  if (entry.category === "rating") return "rating";
  if (entry.category === "context") return "context";
  return "general";
}

function originBucket(
  entry: DictionaryEntry,
): Exclude<(typeof ORIGIN_OPTIONS)[number]["value"], "all"> {
  const source = String(entry.source ?? "").toLowerCase();
  if (entry.originType === "football_manager") return "football_manager";
  if (entry.originType === "calculated") return "calculated";
  if (entry.originType === "manual") return "manual";
  if (source.includes("system") || source.includes("sistema")) return "system";
  return "manual";
}

function toForm(entry?: DictionaryEntry): EntryFormState {
  return {
    id: entry?.id,
    name: entry?.name ?? "",
    key: entry?.key ?? "",
    abbreviation: entry?.abbreviation ?? "",
    aliases: entry?.aliases ? [...entry.aliases] : [],
    description: entry?.description ?? "",
    entity: entry?.entity ?? "player",
    domain: entry?.domain ?? "profile",
    category: entry?.category ?? "profile_field",
    importGroup: entry?.importGroup ?? "player_profile",
    source: entry?.source ?? "manual",
    originType: entry?.originType ?? "manual",
    unit: entry?.unit ?? "",
    dataType: entry?.dataType ?? "string",
    searchable: entry?.searchable ?? true,
    visible: entry?.visible ?? true,
    deprecated: entry?.deprecated ?? false,
    // v2.0 KB fields
    status: entry?.status ?? "",
    subcategory: entry?.subcategory ?? "",
    importContexts: entry?.importContexts ? [...entry.importContexts] : [],
    examples: entry?.examples ? [...entry.examples] : [],
  };
}

function pickExportEntries(
  scope: "entry" | "category" | "domain" | "all" | "metrics" | "attributes" | "selection",
  entries: DictionaryEntry[],
  selected?: DictionaryEntry,
  category?: string,
  domain?: string,
  selectedIds?: Set<string>,
) {
  if (scope === "entry") return selected ? [selected] : [];
  if (scope === "selection") return entries.filter((entry) => selectedIds?.has(entry.id));
  if (scope === "category") return entries.filter((e) => e.category === category);
  if (scope === "domain") return entries.filter((e) => e.domain === domain);
  if (scope === "metrics") return entries.filter((entry) => entry.category === "metric");
  if (scope === "attributes") return entries.filter((entry) => entry.category === "attribute");
  return entries;
}

function triggerJsonDownload(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function advancedSearch(entries: DictionaryEntry[], query: string): DictionaryEntry[] {
  const token = normalizeDictionaryToken(query) ?? "";
  if (!token) return entries;

  const hits = new Set(searchDictionary(query).map((entry) => entry.id));
  return entries.filter((entry) => {
    if (hits.has(entry.id)) return true;
    const haystack = [
      entry.id,
      entry.key,
      entry.name,
      entry.abbreviation ?? "",
      entry.description ?? "",
      entry.category,
      entry.domain,
      entry.importGroup,
      entry.dataType,
      entry.entity,
      entry.source ?? "",
      ...entry.aliases,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(token);
  });
}

function resolveImportConflicts(preview: ImportPreview): DictionaryEntry[] {
  const incomingById = new Map(preview.analysis.incoming.map((entry) => [entry.id, entry]));
  const currentById = new Map(preview.currentEntries.map((entry) => [entry.id, entry]));
  const byId = new Map(preview.afterEntries.map((entry) => [entry.id, { ...entry }]));

  for (const conflict of preview.analysis.conflicts) {
    const choice = preview.conflictResolutions[conflict.id] ?? { action: "keep_current" as const };
    const incoming = incomingById.get(conflict.incomingEntryId);
    const existing =
      byId.get(conflict.existingEntryId) ?? currentById.get(conflict.existingEntryId);
    if (!incoming || !existing) continue;

    if (choice.action === "keep_current") continue;

    if (conflict.field === "alias") {
      const target = byId.get(incoming.id) ?? incoming;
      const value =
        choice.action === "manual" ? choice.manualValue?.trim() || conflict.value : conflict.value;
      if (!value) continue;
      byId.set(existing.id, {
        ...existing,
        aliases: existing.aliases.filter(
          (alias) => alias.toLowerCase() !== conflict.value.toLowerCase(),
        ),
      });
      byId.set(target.id, { ...target, aliases: [...new Set([...target.aliases, value])] });
      continue;
    }

    if (conflict.field === "abbreviation") {
      const target = byId.get(incoming.id) ?? incoming;
      const value = choice.action === "manual" ? choice.manualValue?.trim() : incoming.abbreviation;
      if (!value) continue;
      byId.set(existing.id, { ...existing, abbreviation: undefined });
      byId.set(target.id, { ...target, abbreviation: value });
      continue;
    }

    if (conflict.field === "key") {
      const target = byId.get(incoming.id) ?? incoming;
      const value = choice.action === "manual" ? choice.manualValue?.trim() : incoming.key;
      if (!value) continue;
      byId.set(target.id, { ...target, key: value });
      continue;
    }

    if (conflict.field === "id") {
      const target = byId.get(incoming.id) ?? incoming;
      const value = choice.action === "manual" ? choice.manualValue?.trim() : incoming.id;
      if (!value) continue;
      byId.delete(target.id);
      byId.set(value, { ...target, id: value });
    }
  }

  return [...byId.values()];
}

function DictionaryPage() {
  const [revision, setRevision] = useState(0);
  const entries = useMemo(() => listDictionaryEntries(), [revision]);
  const stats = useMemo(() => getDictionaryStats(), [revision]);
  const kbStats = useMemo(() => getDictionaryStatsV2(), [revision]);
  const validation = useMemo(() => validateDictionary(entries), [entries]);
  const customIds = useMemo(
    () => new Set(listCustomDictionaryEntries().map((e) => e.id)),
    [revision],
  );

  // KB state
  const [kbFilter, setKbFilter] = useState<KbStatusFilter>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<DictionaryEntry | null>(null);
  const [smartSuggestion, setSmartSuggestion] = useState<DictionarySmartSuggestion | null>(null);
  const [exampleInput, setExampleInput] = useState("");
  const [entryUsage, setEntryUsage] = useState<DictionaryUsageStats | null>(null);
  const [entryChangelog, setEntryChangelog] = useState<DictionaryChangelogEntry[]>([]);

  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<"all" | DictionaryEntity>("all");
  const [domainFilter, setDomainFilter] = useState<"all" | DictionaryDomain>("all");
  const [bucketFilter, setBucketFilter] = useState<DomainFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [importGroupFilter, setImportGroupFilter] = useState<string>("all");
  const [dataTypeFilter, setDataTypeFilter] = useState<"all" | DictionaryDataType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [aliasFilter, setAliasFilter] = useState<"all" | "with" | "without">("all");
  const [originFilter, setOriginFilter] = useState<(typeof ORIGIN_OPTIONS)[number]["value"]>("all");
  const [searchableFilter, setSearchableFilter] = useState<Tri>("all");
  const [visibleFilter, setVisibleFilter] = useState<Tri>("all");

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<ModalMode>("create");
  const [form, setForm] = useState<EntryFormState>(toForm());
  const [aliasInput, setAliasInput] = useState("");
  const [editorWarnings, setEditorWarnings] = useState<string[]>([]);

  const [exportCategory, setExportCategory] = useState<string>("all");
  const [exportDomain, setExportDomain] = useState<string>("all");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<DictionaryImportMode>("merge");
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [history, setHistory] = useState<DictionaryHistoryRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const pushHistory = (record: Omit<DictionaryHistoryRecord, "id">) => {
    const nextRecord: DictionaryHistoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setHistory((prev) => {
      const next = [nextRecord, ...prev].slice(0, 300);
      saveHistory(next);
      return next;
    });
  };

  const selectedEntry = useMemo(() => {
    if (!selectedId) return null;
    return getDictionaryEntry(selectedId) ?? resolveDictionaryColumn(selectedId);
  }, [selectedId, revision]);

  const selectedHistory = useMemo(
    () => history.find((record) => record.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );

  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))].sort(), [entries]);
  const importGroups = useMemo(
    () => [...new Set(entries.map((e) => e.importGroup))].sort(),
    [entries],
  );
  const domains = useMemo(() => [...new Set(entries.map((e) => e.domain))].sort(), [entries]);

  const searched = useMemo(() => {
    return advancedSearch(entries, query);
  }, [entries, query]);

  const filtered = useMemo(() => {
    const base = searched.filter((entry) => {
      if (entityFilter !== "all" && entry.entity !== entityFilter) return false;
      if (domainFilter !== "all" && entry.domain !== domainFilter) return false;
      if (bucketFilter !== "all" && domainBucket(entry) !== bucketFilter) return false;
      if (categoryFilter !== "all" && entry.category !== categoryFilter) return false;
      if (importGroupFilter !== "all" && entry.importGroup !== importGroupFilter) return false;
      if (dataTypeFilter !== "all" && entry.dataType !== dataTypeFilter) return false;
      if (aliasFilter === "with" && entry.aliases.length === 0) return false;
      if (aliasFilter === "without" && entry.aliases.length > 0) return false;
      if (statusFilter === "active" && entry.deprecated) return false;
      if (statusFilter === "deprecated" && !entry.deprecated) return false;
      if (originFilter !== "all" && originBucket(entry) !== originFilter) return false;
      if (searchableFilter === "yes" && !entry.searchable) return false;
      if (searchableFilter === "no" && entry.searchable) return false;
      if (visibleFilter === "yes" && !entry.visible) return false;
      if (visibleFilter === "no" && entry.visible) return false;
      return true;
    });
    // Apply KB status filter
    if (kbFilter === "all") return base;
    return filterDictionaryByKB(base, { status: kbFilter });
  }, [
    searched,
    entityFilter,
    domainFilter,
    bucketFilter,
    categoryFilter,
    importGroupFilter,
    dataTypeFilter,
    aliasFilter,
    statusFilter,
    originFilter,
    searchableFilter,
    visibleFilter,
    kbFilter,
  ]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    const sign = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const pick = (entry: DictionaryEntry): string | number | boolean => {
        if (sortKey === "name") return entry.name;
        if (sortKey === "key") return entry.key;
        if (sortKey === "entity") return entry.entity;
        if (sortKey === "domain") return entry.domain;
        if (sortKey === "category") return entry.category;
        if (sortKey === "importGroup") return entry.importGroup;
        if (sortKey === "aliases") return entry.aliases.length;
        return entry.deprecated;
      };
      const va = pick(a);
      const vb = pick(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
      if (typeof va === "boolean" && typeof vb === "boolean")
        return (Number(va) - Number(vb)) * sign;
      return String(va).localeCompare(String(vb), "pt", { sensitivity: "base" }) * sign;
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const statsAny = stats as unknown as Record<string, unknown>;
  const entriesByEntity = (statsAny.entriesByEntity ?? null) as Record<string, number> | null;
  const entriesByDomain = (statsAny.entriesByDomain ?? null) as Record<string, number> | null;
  const entriesByCategory = (statsAny.entriesByCategory ?? null) as Record<string, number> | null;
  const entriesByImportGroup = (statsAny.entriesByImportGroup ?? null) as Record<
    string,
    number
  > | null;
  const aliasCoverage =
    stats.totalEntries > 0 ? Math.round((stats.totalAliases / stats.totalEntries) * 100) : 0;
  const hiddenEntriesCount = entries.filter((entry) => !entry.visible).length;
  const noDescriptionCount = entries.filter((entry) => !(entry.description ?? "").trim()).length;
  const noAliasesCount = entries.filter((entry) => entry.aliases.length === 0).length;
  const categoriesCount = new Set(entries.map((entry) => entry.category)).size;
  const groupsCount = new Set(entries.map((entry) => entry.domain)).size;
  const entitiesCount = new Set(entries.map((entry) => entry.entity)).size;
  const orphanEntriesCount = entries.filter(
    (entry) => entry.aliases.length === 0 && !entry.description && !entry.abbreviation,
  ).length;
  const invalidReferencesCount = validation.errors.filter(
    (issue) => issue.code === "invalid_category" || issue.code === "invalid_import_group",
  ).length;

  const validationGroups = useMemo(() => {
    const codeMap: Record<string, DictionaryValidationIssue[]> = {
      duplicate_id: [],
      duplicate_key: [],
      duplicate_alias: [],
      duplicate_abbreviation: [],
      required_fields: [],
      deprecated: [],
      ambiguous_aliases: [],
      invalid_category: [],
      invalid_import_group: [],
    };

    for (const issue of validation.errors) {
      if (issue.code in codeMap) codeMap[issue.code].push(issue);
    }
    for (const issue of validation.warnings) {
      if (issue.code === "duplicate_alias") codeMap.ambiguous_aliases.push(issue);
      if (issue.code === "duplicate_abbreviation") codeMap.duplicate_abbreviation.push(issue);
      if (issue.code === "invalid_category") codeMap.invalid_category.push(issue);
      if (issue.code === "invalid_import_group") codeMap.invalid_import_group.push(issue);
    }

    codeMap.deprecated = entries
      .filter((e) => e.deprecated)
      .map((e) => ({
        code: "duplicate_alias",
        message: `Deprecated: ${e.id}`,
        entryId: e.id,
        value: e.id,
      }));

    return codeMap;
  }, [validation, entries]);

  const validationReport = useMemo(() => {
    const missingCategory = entries.filter((entry) => !entry.category).length;
    const missingDescription = entries.filter((entry) => !(entry.description ?? "").trim()).length;
    const missingAliases = entries.filter((entry) => entry.aliases.length === 0).length;
    const orphanEntries = entries.filter(
      (entry) => entry.aliases.length === 0 && !(entry.description ?? "").trim(),
    ).length;
    const invalidReferences = validation.errors.filter(
      (issue) => issue.code === "invalid_category" || issue.code === "invalid_import_group",
    ).length;
    return {
      duplicateKeys: validationGroups.duplicate_key.length,
      duplicateIds: validationGroups.duplicate_id.length,
      duplicateAliases: validationGroups.duplicate_alias.length,
      duplicateAbbreviations: validationGroups.duplicate_abbreviation.length,
      missingCategory,
      missingDescription,
      missingAliases,
      orphanEntries,
      invalidReferences,
    };
  }, [entries, validation, validationGroups]);

  const setField = <K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreate = () => {
    setEditorMode("create");
    setForm(toForm());
    setAliasInput("");
    setExampleInput("");
    setSmartSuggestion(null);
    setEditorWarnings([]);
    setEditorOpen(true);
  };

  const openEdit = (entry: DictionaryEntry) => {
    setEditorMode("edit");
    setForm(toForm(entry));
    setAliasInput("");
    setExampleInput("");
    setSmartSuggestion(null);
    setEditorWarnings([]);
    setEditorOpen(true);
  };

  const openDuplicate = (entry: DictionaryEntry) => {
    const draft = toForm(entry);
    draft.id = undefined;
    draft.name = "";
    draft.key = "";
    setEditorMode("duplicate");
    setForm(draft);
    setAliasInput("");
    setExampleInput("");
    setSmartSuggestion(null);
    setEditorWarnings([]);
    setEditorOpen(true);
  };

  const openDetail = (entry: DictionaryEntry) => {
    setDetailEntry(entry);
    setEntryUsage(getDictionaryUsageStats(entry.id));
    setEntryChangelog(getDictionaryChangelog(entry.id));
    setDetailOpen(true);
  };

  const addAlias = () => {
    const value = aliasInput.trim();
    if (!value) return;
    const exists = form.aliases.some(
      (a) => normalizeDictionaryToken(a) === normalizeDictionaryToken(value),
    );
    if (exists) {
      toast.warning("Alias duplicado na entrada atual.");
      return;
    }
    setField("aliases", [...form.aliases, value]);
    setAliasInput("");
  };

  const updateAlias = (index: number, value: string) => {
    const next = [...form.aliases];
    next[index] = value;
    setField("aliases", next);
  };

  const removeAlias = (index: number) => {
    const next = form.aliases.filter((_, i) => i !== index);
    setField("aliases", next);
  };

  const runEntryValidation = (candidateEntry: DictionaryEntry) => {
    const base = listDictionaryEntries().filter((e) => e.id !== candidateEntry.id);
    const candidateSet = [...base, candidateEntry];
    const result = validateDictionary(candidateSet);

    const relatedWarnings = result.warnings.filter((w) => {
      if (w.entryId === candidateEntry.id) return true;
      if (!w.value) return false;
      const normalized = normalizeDictionaryToken(w.value);
      return candidateEntry.aliases.some((a) => normalizeDictionaryToken(a) === normalized);
    });

    const ambiguous = candidateEntry.aliases
      .map((alias) => ({
        alias,
        matches: searchDictionary(alias).filter((e) => e.id !== candidateEntry.id),
      }))
      .filter((x) => x.matches.length > 0)
      .map((x) => `Alias ambiguo: \"${x.alias}\" coincide com ${x.matches.length} entradas.`);

    const warnings = [...relatedWarnings.map((w) => w.message), ...ambiguous];
    return { result, warnings };
  };

  const saveEntry = () => {
    if (!form.name.trim()) return toast.error("Nome e obrigatorio.");
    if (!form.key.trim()) return toast.error("Key e obrigatoria.");

    const original = form.id ? getDictionaryEntry(form.id) : null;
    const draft: DictionaryEntryDraft = {
      id: form.id,
      key: (editorMode === "edit" && original ? original.key : form.key).trim(),
      name: form.name.trim(),
      abbreviation: form.abbreviation.trim() || undefined,
      aliases: form.aliases.map((a) => a.trim()).filter(Boolean),
      entity: editorMode === "edit" && original ? original.entity : form.entity,
      domain: editorMode === "edit" && original ? original.domain : form.domain,
      category: form.category,
      importGroup: form.importGroup,
      dataType: form.dataType,
      unit: form.unit.trim() || undefined,
      description: form.description.trim() || undefined,
      source: form.source.trim() || undefined,
      originType: form.originType,
      searchable: form.searchable,
      visible: form.visible,
      deprecated: form.deprecated,
      // v2.0 KB fields
      status: form.status || undefined,
      subcategory: form.subcategory || undefined,
      importContexts: form.importContexts.length > 0 ? form.importContexts : undefined,
      examples: form.examples.length > 0 ? form.examples : undefined,
    };

    const candidate = upsertDictionaryEntry(draft, false);
    const { result, warnings } = runEntryValidation(candidate);

    if (!result.valid) {
      toast.error("Validacao falhou. Corrija os erros antes de guardar.");
      setEditorWarnings(result.errors.map((e) => e.message));
      return;
    }

    setEditorWarnings(warnings);
    upsertDictionaryEntry(draft, true);

    const changedFields = original ? JSON.stringify(original) !== JSON.stringify(candidate) : false;

    // Record in KB changelog
    if (editorMode === "create" || editorMode === "duplicate") {
      appendDictionaryChangelog(candidate.id, { eventType: "created", note: "Criado via editor." });
    } else if (changedFields) {
      appendDictionaryChangelog(candidate.id, { eventType: "name_changed", note: "Atualizado via editor." });
    }

    const warningsForHistory = [...warnings];
    const errorsForHistory: string[] = [];
    const addedIds = editorMode === "create" || editorMode === "duplicate" ? [candidate.id] : [];
    const updatedIds = editorMode === "edit" && changedFields ? [candidate.id] : [];
    const ignoredIds = editorMode === "edit" && !changedFields ? [candidate.id] : [];
    pushHistory({
      atIso: new Date().toISOString(),
      user: null,
      type: "Atualização",
      fileName: null,
      added: addedIds,
      updated: updatedIds,
      ignored: ignoredIds,
      removed: [],
      warnings: warningsForHistory,
      errors: errorsForHistory,
      status: getOperationStatus(warningsForHistory, errorsForHistory),
    });

    setRevision((v) => v + 1);
    setEditorOpen(false);
    toast.success(
      editorMode === "create"
        ? "Entrada criada."
        : editorMode === "duplicate"
          ? "Entrada duplicada."
          : "Entrada atualizada.",
    );
    if (warnings.length > 0) {
      toast.warning(`Guardado com ${warnings.length} aviso(s).`);
    }
  };

  const exportScope = (
    scope: "entry" | "category" | "domain" | "all" | "metrics" | "attributes" | "selection",
  ) => {
    const targetEntries = pickExportEntries(
      scope,
      entries,
      selectedEntry ?? undefined,
      exportCategory,
      exportDomain,
      selectedIds,
    );
    if (targetEntries.length === 0) {
      toast.error("Nada para exportar com os filtros atuais.");
      return;
    }
    const payload = exportDictionary(targetEntries);
    const fileName = `dictionary-${scope}-${Date.now()}.json`;
    triggerJsonDownload(fileName, payload);
    pushHistory({
      atIso: new Date().toISOString(),
      user: null,
      type: "Export JSON",
      fileName,
      added: [],
      updated: [],
      ignored: targetEntries.map((entry) => entry.id),
      removed: [],
      warnings: [],
      errors: [],
      status: "OK",
    });
    toast.success(`Exportacao ${scope} concluida.`);
  };

  const handleDelete = (entry: DictionaryEntry) => {
    if (!customIds.has(entry.id)) {
      toast.error("A eliminacao e permitida apenas para entradas customizadas.");
      return;
    }

    const tokens = [entry.id, entry.key, entry.name, entry.abbreviation, ...entry.aliases]
      .map((x) => normalizeDictionaryToken(String(x ?? "")))
      .filter((x): x is string => Boolean(x));

    const dependencies = entries.filter(
      (other) =>
        other.id !== entry.id &&
        other.aliases.some((a) => tokens.includes(normalizeDictionaryToken(a) ?? "")),
    );

    if (dependencies.length > 0) {
      toast.error("Eliminacao bloqueada: existem dependencias no Dictionary para esta entrada.");
      return;
    }

    const ok = window.confirm(`Confirmar eliminacao da entrada ${entry.id}?`);
    if (!ok) return;

    const payload = exportDictionary(entries.filter((e) => e.id !== entry.id));
    const result = applyDictionaryImport(payload, { mode: "replace_all" });

    if (!result.ok) {
      toast.error("Falha ao eliminar entrada. Validacao de importacao falhou.");
      return;
    }

    setRevision((v) => v + 1);
    setSelectedId((id) => (id === entry.id ? null : id));
    pushHistory({
      atIso: new Date().toISOString(),
      user: null,
      type: "Atualização",
      fileName: null,
      added: [],
      updated: [],
      ignored: [],
      removed: [entry.id],
      warnings: [],
      errors: [],
      status: "OK",
    });
    toast.success("Entrada eliminada.");
  };

  const parseImportFile = async (file: File) => {
    const text = await file.text();
    const raw = JSON.parse(text) as DictionaryExportPayload | DictionaryEntry[];
    const analysis = analyzeDictionaryImport(raw, importMode, entries);
    const fileDateIso = Array.isArray(raw)
      ? new Date(file.lastModified || Date.now()).toISOString()
      : raw.exportedAt || new Date(file.lastModified || Date.now()).toISOString();

    const currentEntries = [...entries];
    const afterEntries = [...analysis.finalEntries];
    const conflictResolutions: DictionaryConflictResolutionMap = Object.fromEntries(
      analysis.conflicts.map((conflict) => [conflict.id, { action: "keep_current" as const }]),
    );

    const incoming = [...analysis.incoming];
    const entitiesCount = new Set(incoming.map((entry) => entry.entity)).size;
    const attributesCount = incoming.filter((entry) => entry.category === "attribute").length;
    const metricsCount = incoming.filter((entry) => entry.category === "metric").length;
    const aliasesCount = incoming.reduce((sum, entry) => sum + entry.aliases.length, 0);
    const invalidEntryIds = new Set(
      analysis.validation.errors.map((issue) => issue.entryId).filter(Boolean) as string[],
    );
    const invalidEntries = incoming.filter((entry) => invalidEntryIds.has(entry.id));
    const newAliases = analysis.updated.flatMap((entry) => entry.aliases);

    setImportPreview({
      fileName: file.name,
      fileDateIso,
      payload: raw,
      mode: importMode,
      analysis,
      resolvedEntries: afterEntries,
      currentEntries,
      afterEntries,
      conflictResolutions,
      newAliases,
      invalidEntries,
      entitiesCount,
      attributesCount,
      metricsCount,
      aliasesCount,
      validationErrors: analysis.validation.errors,
      validationWarnings: analysis.validation.warnings,
    });
  };

  const updateConflictResolution = (
    conflictId: string,
    resolution: DictionaryConflictResolution,
  ) => {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const nextResolutions = {
        ...prev.conflictResolutions,
        [conflictId]: resolution,
      };
      const withResolutions: ImportPreview = {
        ...prev,
        conflictResolutions: nextResolutions,
      };
      const resolvedEntries = resolveImportConflicts(withResolutions);
      return {
        ...withResolutions,
        resolvedEntries,
      };
    });
  };

  const applyImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    setImportProgress(10);

    const result = applyDictionaryImport(importPreview.payload, {
      mode: importPreview.mode,
      resolutions: importPreview.conflictResolutions,
    });
    setImportProgress(85);

    if (!result.ok) {
      setImporting(false);
      setImportProgress(0);
      toast.error("Importacao invalida. Corrija conflitos antes de aplicar.");
      pushHistory({
        atIso: new Date().toISOString(),
        user: null,
        type: "Import JSON",
        mode: importPreview.mode,
        fileName: importPreview.fileName,
        added: importPreview.analysis.created.map((entry) => entry.id),
        updated: importPreview.analysis.updated.map((entry) => entry.id),
        ignored: importPreview.analysis.ignored.map((entry) => entry.id),
        removed: [],
        aliasesAdded: importPreview.analysis.aliasesAdded,
        conflicts: importPreview.analysis.conflicts.length,
        warnings: result.warnings.map((issue) => issue.message),
        errors: result.errors.map((issue) => issue.message),
        status: getOperationStatus(
          result.warnings.map((issue) => issue.message),
          result.errors.map((issue) => issue.message),
        ),
      });
      return;
    }

    const warnings = result.warnings.map((issue) => issue.message);
    const errors = result.errors.map((issue) => issue.message);
    const operationType: DictionaryOperationType =
      importPreview.mode === "replace_all" ? "Reposição" : "Import JSON";

    pushHistory({
      atIso: new Date().toISOString(),
      user: null,
      type: operationType,
      mode: importPreview.mode,
      fileName: importPreview.fileName,
      added: importPreview.analysis.created.map((entry) => entry.id),
      updated: importPreview.analysis.updated.map((entry) => entry.id),
      ignored: importPreview.analysis.ignored.map((entry) => entry.id),
      removed: [],
      aliasesAdded: importPreview.analysis.aliasesAdded,
      conflicts: importPreview.analysis.conflicts.length,
      warnings,
      errors,
      status: getOperationStatus(warnings, errors),
    });

    setImportProgress(100);
    setRevision((v) => v + 1);
    setImporting(false);
    toast.success(`Importacao concluida: ${result.imported} entradas.`);
    setImportPreview(null);
    setImportProgress(0);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const toggleSelectedRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPagedSelected = paged.length > 0 && paged.every((entry) => selectedIds.has(entry.id));

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPagedSelected) {
        for (const entry of paged) next.delete(entry.id);
      } else {
        for (const entry of paged) next.add(entry.id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold font-display">
          <BookOpen className="size-6 text-gold" />
          Dictionary
          <Badge variant="outline" className="ml-2 text-xs">Knowledge Base v2</Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          Centro de conhecimento do Data Dictionary — metadados completos, utilização e descoberta inteligente.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.totalEntries}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Atributos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.totalAttributes}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Metricas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.totalMetrics}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Aliases</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.totalAliases}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{categoriesCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Grupos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{groupsCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Entidades</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{entitiesCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ocultas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{hiddenEntriesCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Deprecated</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.deprecatedEntries}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Sem Descricao</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{noDescriptionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Sem Aliases</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{noAliasesCount}</CardContent>
        </Card>
      </section>

      {/* KB Status Cards */}
      <section>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
          <Layers className="size-3.5" /> Knowledge Base — Estado dos Campos
        </h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
          {(
            [
              { key: "all", label: "Todos", icon: <BookOpen className="size-3" />, count: stats.totalEntries, color: "" },
              { key: "official", label: "Oficiais", icon: <Star className="size-3 text-yellow-500" />, count: kbStats.totalOfficial, color: "text-yellow-600" },
              { key: "confirmed", label: "Confirmados", icon: <CheckCircle2 className="size-3 text-green-500" />, count: kbStats.totalConfirmed, color: "text-green-600" },
              { key: "auto_discovered", label: "Auto-descobertos", icon: <Lightbulb className="size-3 text-blue-500" />, count: kbStats.totalAutoDiscovered, color: "text-blue-600" },
              { key: "pending", label: "Pendentes", icon: <HelpCircle className="size-3 text-orange-400" />, count: kbStats.totalPending, color: "text-orange-500" },
              { key: "ignored", label: "Ignorados", icon: <XCircle className="size-3 text-gray-400" />, count: kbStats.totalIgnored, color: "text-gray-500" },
              { key: "obsolete", label: "Obsoletos", icon: <AlertCircle className="size-3 text-red-400" />, count: kbStats.totalObsolete, color: "text-red-500" },
            ] as { key: KbStatusFilter; label: string; icon: React.ReactNode; count: number; color: string }[]
          ).map(({ key, label, icon, count, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setKbFilter(key)}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${kbFilter === key ? "border-primary bg-accent" : "border-border bg-card"}`}
            >
              <div className={`flex items-center gap-1 text-xs mb-1 ${color}`}>{icon}{label}</div>
              <div className="text-xl font-semibold">{count}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estatisticas avancadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              Entradas Deprecated: <b>{stats.deprecatedEntries}</b>
            </div>
            <div>
              Aliases por entrada:{" "}
              <b>
                {stats.totalEntries ? (stats.totalAliases / stats.totalEntries).toFixed(2) : "0.00"}
              </b>
            </div>
            <div>
              Cobertura dos aliases: <b>{aliasCoverage}%</b>
            </div>
            <Separator />
            <div className="font-medium">Entradas por Entity</div>
            {entriesByEntity ? (
              Object.entries(entriesByEntity).map(([k, v]) => (
                <div key={k}>
                  {toTitle(k)}: {v}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Nao disponivel em DictionaryStats.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por Domain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {entriesByDomain ? (
              Object.entries(entriesByDomain).map(([k, v]) => (
                <div key={k}>
                  {toTitle(k)}: {v}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Nao disponivel em DictionaryStats.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por Categoria e Import Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">Categorias</div>
            {entriesByCategory ? (
              Object.entries(entriesByCategory).map(([k, v]) => (
                <div key={k}>
                  {toTitle(k)}: {v}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Nao disponivel em DictionaryStats.</div>
            )}
            <Separator />
            <div className="font-medium">Import Groups</div>
            {entriesByImportGroup ? (
              Object.entries(entriesByImportGroup).map(([k, v]) => (
                <div key={k}>
                  {toTitle(k)}: {v}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Nao disponivel em DictionaryStats.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="catalogo" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="catalogo">Catalogo</TabsTrigger>
          <TabsTrigger value="validacao">Validacao</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="integracoes">Integracoes</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Pesquisa avancada</CardTitle>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-4 mr-1" />
                  Nova Entrada
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Texto (usa searchDictionary)"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <div>
                  <Label>Entity</Label>
                  <Select
                    value={entityFilter}
                    onValueChange={(v) => setEntityFilter(v as typeof entityFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Domain</Label>
                  <Select
                    value={domainFilter}
                    onValueChange={(v) => setDomainFilter(v as typeof domainFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAIN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bucket</Label>
                  <Select
                    value={bucketFilter}
                    onValueChange={(v) => setBucketFilter(v as DomainFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="attribute">Attribute</SelectItem>
                      <SelectItem value="metric">Metric</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="context">Context</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((x) => (
                        <SelectItem key={x} value={x}>
                          {toTitle(x)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Import Group</Label>
                  <Select value={importGroupFilter} onValueChange={setImportGroupFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {importGroups.map((x) => (
                        <SelectItem key={x} value={x}>
                          {toTitle(x)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Type</Label>
                  <Select
                    value={dataTypeFilter}
                    onValueChange={(v) => setDataTypeFilter(v as "all" | DictionaryDataType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {DATA_TYPE_OPTIONS.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deprecated</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Aliases</Label>
                  <Select
                    value={aliasFilter}
                    onValueChange={(v) => setAliasFilter(v as "all" | "with" | "without")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="with">Com aliases</SelectItem>
                      <SelectItem value="without">Sem aliases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Searchable</Label>
                  <Select
                    value={searchableFilter}
                    onValueChange={(v) => setSearchableFilter(v as Tri)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sim</SelectItem>
                      <SelectItem value="no">Nao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visible</Label>
                  <Select value={visibleFilter} onValueChange={(v) => setVisibleFilter(v as Tri)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sim</SelectItem>
                      <SelectItem value="no">Nao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Origem</Label>
                  <Select
                    value={originFilter}
                    onValueChange={(v) => setOriginFilter(v as typeof originFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGIN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Entradas ({sorted.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportScope("entry")}
                    disabled={!selectedEntry}
                  >
                    <Download className="size-4 mr-1" />
                    Exportar entrada
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportScope("metrics")}>
                    <Download className="size-4 mr-1" />
                    Exportar métricas
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportScope("attributes")}>
                    <Download className="size-4 mr-1" />
                    Exportar atributos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportScope("selection")}
                    disabled={selectedIds.size === 0}
                  >
                    <Download className="size-4 mr-1" />
                    Exportar seleção ({selectedIds.size})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportScope("all")}>
                    <FileJson className="size-4 mr-1" />
                    Exportar tudo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4">
                <div className="md:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Categoria para exportar</Label>
                    <Select value={exportCategory} onValueChange={setExportCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Selecione</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {toTitle(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportScope("category")}
                    disabled={exportCategory === "all"}
                  >
                    Exportar categoria
                  </Button>
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Domain para exportar</Label>
                    <Select value={exportDomain} onValueChange={setExportDomain}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Selecione</SelectItem>
                        {domains.map((d) => (
                          <SelectItem key={d} value={d}>
                            {toTitle(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportScope("domain")}
                    disabled={exportDomain === "all"}
                  >
                    Exportar domain
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <input
                          type="checkbox"
                          checked={allPagedSelected}
                          onChange={toggleSelectPage}
                        />
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("name")}>
                          Nome
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("key")}>
                          Key
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("entity")}>
                          Entity
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("domain")}>
                          Domain
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("category")}>
                          Categoria
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("importGroup")}>
                          Import Group
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("aliases")}>
                          Aliases
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("deprecated")}>
                          Estado
                        </button>
                      </TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(entry.id)}
                        onDoubleClick={() => openDetail(entry)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectedRow(entry.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell>{entry.key}</TableCell>
                        <TableCell>{toTitle(entry.entity)}</TableCell>
                        <TableCell>{toTitle(entry.domain)}</TableCell>
                        <TableCell>{toTitle(entry.category)}</TableCell>
                        <TableCell>{toTitle(entry.importGroup)}</TableCell>
                        <TableCell>{entry.aliases.length}</TableCell>
                        <TableCell>
                          {entry.deprecated ? (
                            <Badge variant="destructive">Deprecated</Badge>
                          ) : (
                            <Badge variant="secondary">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(entry);
                              }}
                              title="Editar"
                            >
                              <Save className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDuplicate(entry);
                              }}
                              title="Duplicar"
                            >
                              <Copy className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(entry);
                              }}
                              title="Eliminar"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paged.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Sem resultados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Linhas</Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Pagina {currentPage}/{totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Seguinte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Importacao Inteligente</CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={importMode}
                    onValueChange={(value) => setImportMode(value as DictionaryImportMode)}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPORT_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label
                    htmlFor="dictionary-import-json"
                    className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm"
                  >
                    <Upload className="size-4" />
                    Importar JSON
                  </Label>
                  <Button variant="outline" onClick={() => exportScope("all")}>
                    <Download className="size-4 mr-1" />
                    Exportar Dictionary
                  </Button>
                </div>
                <Input
                  id="dictionary-import-json"
                  className="hidden"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await parseImportFile(file);
                      toast.success("Preview de importacao gerado.");
                    } catch {
                      toast.error("Ficheiro JSON invalido para importacao.");
                    }
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {importing ? <Progress value={importProgress} /> : null}
              {!importPreview ? (
                <p className="text-sm text-muted-foreground">
                  Importe um ficheiro JSON para visualizar o resumo antes de aplicar.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-sm">
                    <div>
                      Nome do ficheiro: <b>{importPreview.fileName}</b>
                    </div>
                    <div>
                      Data: <b>{formatDateTime(importPreview.fileDateIso)}</b>
                    </div>
                    <div>
                      Modo:{" "}
                      <b>
                        {IMPORT_MODE_OPTIONS.find((m) => m.value === importPreview.mode)?.label}
                      </b>
                    </div>
                    <div>
                      N. entradas: <b>{importPreview.analysis.incoming.length}</b>
                    </div>
                    <div>
                      N. aliases: <b>{importPreview.aliasesCount}</b>
                    </div>
                    <div>
                      N. entidades: <b>{importPreview.entitiesCount}</b>
                    </div>
                    <div>
                      N. atributos: <b>{importPreview.attributesCount}</b>
                    </div>
                    <div>
                      N. metricas: <b>{importPreview.metricsCount}</b>
                    </div>
                    <div>
                      N. warnings: <b>{importPreview.validationWarnings.length}</b>
                    </div>
                    <div>
                      N. erros: <b>{importPreview.validationErrors.length}</b>
                    </div>
                    <div>
                      Entradas atuais: <b>{importPreview.currentEntries.length}</b>
                    </div>
                    <div>
                      Entradas apos import: <b>{importPreview.afterEntries.length}</b>
                    </div>
                    <div>
                      Entradas novas: <b>{importPreview.analysis.created.length}</b>
                    </div>
                    <div>
                      Entradas atualizadas: <b>{importPreview.analysis.updated.length}</b>
                    </div>
                    <div>
                      Entradas ignoradas: <b>{importPreview.analysis.ignored.length}</b>
                    </div>
                    <div>
                      Conflitos: <b>{importPreview.analysis.conflicts.length}</b>
                    </div>
                    <div>
                      Aliases novos: <b>{importPreview.analysis.aliasesAdded}</b>
                    </div>
                    <div>
                      Aliases duplicados: <b>{importPreview.analysis.duplicateAliases}</b>
                    </div>
                    <div>
                      Keys duplicadas: <b>{importPreview.analysis.duplicateKeys}</b>
                    </div>
                    <div>
                      IDs duplicados: <b>{importPreview.analysis.duplicateIds}</b>
                    </div>
                    <div>
                      Abreviacoes duplicadas: <b>{importPreview.analysis.duplicateAbbreviations}</b>
                    </div>
                    <div>
                      Entradas invalidas: <b>{importPreview.invalidEntries.length}</b>
                    </div>
                  </div>

                  {(importPreview.validationErrors.length > 0 ||
                    importPreview.validationWarnings.length > 0 ||
                    importPreview.analysis.conflicts.length > 0) && (
                    <div className="rounded-md border p-3 text-sm space-y-1">
                      {importPreview.analysis.conflicts.slice(0, 20).map((conflict) => (
                        <div key={conflict.id} className="text-muted-foreground">
                          Conflito: {conflict.message}
                        </div>
                      ))}
                      {importPreview.validationErrors.map((x, i) => (
                        <div key={`err-${i}`} className="text-destructive">
                          Erro: {x.message}
                        </div>
                      ))}
                      {importPreview.validationWarnings.map((x, i) => (
                        <div key={`warn-${i}`} className="text-muted-foreground">
                          Aviso: {x.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {importPreview.analysis.conflicts.length > 0 ? (
                    <div className="rounded-md border p-3 space-y-2">
                      <p className="font-medium text-sm">Resolver conflitos</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Existe em</TableHead>
                            <TableHead>Novo</TableHead>
                            <TableHead>Acao</TableHead>
                            <TableHead>Manual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.analysis.conflicts.map((conflict) => {
                            const resolution = importPreview.conflictResolutions[conflict.id] ?? {
                              action: "keep_current" as const,
                            };
                            return (
                              <TableRow key={conflict.id}>
                                <TableCell>{conflict.field}</TableCell>
                                <TableCell>{conflict.value}</TableCell>
                                <TableCell>{conflict.existingEntryId}</TableCell>
                                <TableCell>{conflict.incomingEntryId}</TableCell>
                                <TableCell>
                                  <Select
                                    value={resolution.action}
                                    onValueChange={(value) =>
                                      updateConflictResolution(conflict.id, {
                                        action: value as DictionaryConflictResolution["action"],
                                        manualValue: resolution.manualValue,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="w-[150px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="keep_current">Manter atual</SelectItem>
                                      <SelectItem value="use_new">Usar nova</SelectItem>
                                      <SelectItem value="manual">Editar manualmente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  {resolution.action === "manual" ? (
                                    <Input
                                      value={resolution.manualValue ?? ""}
                                      onChange={(event) =>
                                        updateConflictResolution(conflict.id, {
                                          action: "manual",
                                          manualValue: event.target.value,
                                        })
                                      }
                                      placeholder="Novo valor"
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}

                  <details className="rounded-md border p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Preview antes de importar
                    </summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded border p-2">
                        <p className="font-medium">Atual</p>
                        <p className="text-muted-foreground">
                          {importPreview.currentEntries.length} entradas
                        </p>
                      </div>
                      <div className="rounded border p-2">
                        <p className="font-medium">Nova</p>
                        <p className="text-muted-foreground">
                          {importPreview.afterEntries.length} entradas
                        </p>
                      </div>
                    </div>
                  </details>

                  <details className="rounded-md border p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Comparacao de versoes (Atual vs Nova)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {importPreview.analysis.updated.slice(0, 20).map((entry) => {
                        const current = importPreview.currentEntries.find(
                          (item) => item.id === entry.id || item.key === entry.key,
                        );
                        return (
                          <div key={`cmp-${entry.id}`} className="rounded border p-2">
                            <p className="font-medium">{entry.name}</p>
                            <div className="grid gap-2 md:grid-cols-2 text-xs">
                              <div>
                                <p className="font-medium">Atual</p>
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(current ?? {}, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="font-medium">Nova</p>
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(entry, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {importPreview.analysis.updated.length === 0 ? (
                        <p className="text-muted-foreground">Sem entradas atualizadas.</p>
                      ) : null}
                    </div>
                  </details>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => void applyImport()}
                      disabled={importPreview.validationErrors.length > 0 || importing}
                    >
                      {importing ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                      Aplicar importacao
                    </Button>
                    <Button variant="outline" onClick={() => setImportPreview(null)}>
                      Limpar preview
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Validação e merge são executados em memória antes da gravação atómica.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validacao" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Validacao do Dictionary</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (validation.valid) toast.success("Dictionary válido.");
                    else toast.error(`Dictionary inválido: ${validation.errors.length} erro(s).`);
                  }}
                >
                  Validar Dictionary
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="size-3" />
                    Valido
                  </Badge>
                ) : (
                  <Badge variant="destructive">Invalido</Badge>
                )}
                <span>Erros: {validation.errors.length}</span>
                <span>Avisos: {validation.warnings.length}</span>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-semibold">Erros</h3>
                  <div>IDs duplicados: {validationReport.duplicateIds}</div>
                  <div>Keys duplicadas: {validationReport.duplicateKeys}</div>
                  <div>Aliases duplicados: {validationReport.duplicateAliases}</div>
                  <div>Abreviaturas duplicadas: {validationReport.duplicateAbbreviations}</div>
                  <div>Entradas sem categoria: {validationReport.missingCategory}</div>
                  <div>Referencias invalidas: {validationReport.invalidReferences}</div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Avisos</h3>
                  <div>Deprecated: {validationGroups.deprecated.length}</div>
                  <div>Aliases ambiguos: {validationGroups.ambiguous_aliases.length}</div>
                  <div>Entradas sem descricao: {validationReport.missingDescription}</div>
                  <div>Entradas sem aliases: {validationReport.missingAliases}</div>
                  <div>Entradas orfas: {validationReport.orphanEntries}</div>
                </div>
              </div>

              {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div className="rounded-md border p-3 space-y-1">
                  {validation.errors.slice(0, 12).map((e, i) => (
                    <div key={`ve-${i}`} className="text-destructive">
                      {e.message}
                    </div>
                  ))}
                  {validation.warnings.slice(0, 12).map((w, i) => (
                    <div key={`vw-${i}`} className="text-muted-foreground">
                      {w.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="space-y-4">
          <Tabs defaultValue="utilizacao" className="space-y-3">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="utilizacao">Utilizacao</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="imports">Imports</TabsTrigger>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="perfis">Perfis</TabsTrigger>
              <TabsTrigger value="historico">Historico</TabsTrigger>
            </TabsList>
            {[
              ["utilizacao", "Utilizacao"],
              ["scores", "Scores"],
              ["imports", "Imports"],
              ["rankings", "Rankings"],
              ["perfis", "Perfis"],
            ].map(([key, label]) => (
              <TabsContent key={key} value={key}>
                <Card>
                  <CardHeader>
                    <CardTitle>{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Disponivel numa versao futura.
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            <TabsContent value="historico" className="space-y-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>Historico</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHistory([]);
                        saveHistory([]);
                        setSelectedHistoryId(null);
                        toast.success("Historico limpo.");
                      }}
                      disabled={history.length === 0}
                    >
                      Limpar historico
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem operacoes registadas.</p>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Utilizador</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Modo</TableHead>
                            <TableHead>Ficheiro</TableHead>
                            <TableHead>Adicionadas</TableHead>
                            <TableHead>Atualizadas</TableHead>
                            <TableHead>Ignoradas</TableHead>
                            <TableHead>Removidas</TableHead>
                            <TableHead>Aliases</TableHead>
                            <TableHead>Conflitos</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((record) => (
                            <TableRow
                              key={record.id}
                              className="cursor-pointer"
                              onClick={() => setSelectedHistoryId(record.id)}
                            >
                              <TableCell>{formatDateTime(record.atIso)}</TableCell>
                              <TableCell>{record.user ?? "-"}</TableCell>
                              <TableCell>{record.type}</TableCell>
                              <TableCell>
                                {record.mode
                                  ? (IMPORT_MODE_OPTIONS.find((m) => m.value === record.mode)
                                      ?.label ?? record.mode)
                                  : "-"}
                              </TableCell>
                              <TableCell>{record.fileName ?? "-"}</TableCell>
                              <TableCell>{record.added.length}</TableCell>
                              <TableCell>{record.updated.length}</TableCell>
                              <TableCell>{record.ignored.length}</TableCell>
                              <TableCell>{record.removed.length}</TableCell>
                              <TableCell>{record.aliasesAdded ?? 0}</TableCell>
                              <TableCell>{record.conflicts ?? 0}</TableCell>
                              <TableCell>
                                {record.status === "OK" && <Badge variant="secondary">OK</Badge>}
                                {record.status === "Avisos" && (
                                  <Badge variant="outline">Avisos</Badge>
                                )}
                                {record.status === "Erros" && (
                                  <Badge variant="destructive">Erros</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <Sheet
        open={Boolean(selectedHistory)}
        onOpenChange={(open) => !open && setSelectedHistoryId(null)}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedHistory?.type ?? "Operacao"}</SheetTitle>
            <SheetDescription>
              {selectedHistory ? formatDateTime(selectedHistory.atIso) : ""}
            </SheetDescription>
          </SheetHeader>
          {!selectedHistory ? null : (
            <div className="space-y-4 pt-6 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Resumo</div>
                <div>Ficheiro: {selectedHistory.fileName ?? "-"}</div>
                <div>Utilizador: {selectedHistory.user ?? "-"}</div>
                <div>
                  Modo:{" "}
                  {selectedHistory.mode
                    ? (IMPORT_MODE_OPTIONS.find((m) => m.value === selectedHistory.mode)?.label ??
                      selectedHistory.mode)
                    : "-"}
                </div>
                <div>Estado: {selectedHistory.status}</div>
                <div>Entradas adicionadas: {selectedHistory.added.length}</div>
                <div>Entradas atualizadas: {selectedHistory.updated.length}</div>
                <div>Entradas ignoradas: {selectedHistory.ignored.length}</div>
                <div>Entradas removidas: {selectedHistory.removed.length}</div>
                <div>Aliases adicionados: {selectedHistory.aliasesAdded ?? 0}</div>
                <div>Conflitos: {selectedHistory.conflicts ?? 0}</div>
              </div>

              <Separator />
              <div className="space-y-1">
                <div className="font-medium">Entradas adicionadas</div>
                <p className="text-muted-foreground">
                  {selectedHistory.added.join(", ") || "(nenhuma)"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Entradas atualizadas</div>
                <p className="text-muted-foreground">
                  {selectedHistory.updated.join(", ") || "(nenhuma)"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Entradas ignoradas</div>
                <p className="text-muted-foreground">
                  {selectedHistory.ignored.join(", ") || "(nenhuma)"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Warnings</div>
                {selectedHistory.warnings.length > 0 ? (
                  selectedHistory.warnings.map((warning, idx) => (
                    <p key={`history-warning-${idx}`} className="text-muted-foreground">
                      {warning}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">(nenhum)</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="font-medium">Erros</div>
                {selectedHistory.errors.length > 0 ? (
                  selectedHistory.errors.map((error, idx) => (
                    <p key={`history-error-${idx}`} className="text-destructive">
                      {error}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">(nenhum)</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedEntry)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedEntry?.name ?? "Entrada"}</SheetTitle>
            <SheetDescription>Detalhe da entrada selecionada.</SheetDescription>
          </SheetHeader>
          {!selectedEntry ? null : (
            <div className="space-y-4 pt-6 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">ID:</span> {selectedEntry.id}
                </div>
                <div>
                  <span className="text-muted-foreground">Key:</span> {selectedEntry.key}
                </div>
                <div>
                  <span className="text-muted-foreground">Entity:</span>{" "}
                  {toTitle(selectedEntry.entity)}
                </div>
                <div>
                  <span className="text-muted-foreground">Domain:</span>{" "}
                  {toTitle(selectedEntry.domain)}
                </div>
                <div>
                  <span className="text-muted-foreground">Categoria:</span>{" "}
                  {toTitle(selectedEntry.category)}
                </div>
                <div>
                  <span className="text-muted-foreground">Import Group:</span>{" "}
                  {toTitle(selectedEntry.importGroup)}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="font-medium">Aliases</div>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.aliases.map((a) => (
                    <Badge key={a} variant="outline">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => openEdit(selectedEntry)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => openDuplicate(selectedEntry)}>
                  Duplicar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedEntry)}>
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ---- KB Detail Sheet ---- */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {detailEntry && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground" />
                  {detailEntry.name}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">{detailEntry.id}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 pt-6">
                <Tabs defaultValue="info">
                  <TabsList className="flex flex-wrap h-auto">
                    <TabsTrigger value="info">Informação</TabsTrigger>
                    <TabsTrigger value="aliases">Aliases</TabsTrigger>
                    <TabsTrigger value="usage">Utilização</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                    <TabsTrigger value="similar">Semelhantes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-3 pt-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Entity:</span> <b>{detailEntry.entity}</b></div>
                      <div><span className="text-muted-foreground">Domain:</span> <b>{detailEntry.domain}</b></div>
                      <div><span className="text-muted-foreground">Categoria:</span> <b>{detailEntry.category}</b></div>
                      <div><span className="text-muted-foreground">Subcategoria:</span> <b>{detailEntry.subcategory ?? "—"}</b></div>
                      <div><span className="text-muted-foreground">DataType:</span> <b>{detailEntry.dataType}</b></div>
                      <div><span className="text-muted-foreground">Unit:</span> <b>{detailEntry.unit ?? "—"}</b></div>
                      <div><span className="text-muted-foreground">Estado KB:</span> <b>{detailEntry.status ?? "—"}</b></div>
                      <div><span className="text-muted-foreground">Deprecated:</span> <b>{detailEntry.deprecated ? "Sim" : "Não"}</b></div>
                      <div><span className="text-muted-foreground">Visible:</span> <b>{detailEntry.visible ? "Sim" : "Não"}</b></div>
                      <div><span className="text-muted-foreground">Searchable:</span> <b>{detailEntry.searchable ? "Sim" : "Não"}</b></div>
                    </div>
                    {detailEntry.description && (
                      <p className="text-sm text-muted-foreground">{detailEntry.description}</p>
                    )}
                    {detailEntry.importContexts && detailEntry.importContexts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Contextos de Import</p>
                        <div className="flex flex-wrap gap-1">
                          {detailEntry.importContexts.map((ctx) => (
                            <Badge key={ctx} variant="outline" className="text-xs">{ctx.replace("import_", "")}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {detailEntry.examples && detailEntry.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Exemplos</p>
                        <div className="flex flex-wrap gap-1">
                          {detailEntry.examples.map((ex, i) => (
                            <Badge key={i} variant="secondary" className="font-mono text-xs">{ex}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => { setDetailOpen(false); openEdit(detailEntry); }}>
                        Editar
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="aliases" className="pt-4">
                    {detailEntry.aliases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem aliases definidos.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {detailEntry.aliases.map((alias) => (
                          <Badge key={alias} variant="outline" className="font-mono text-xs">{alias}</Badge>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="usage" className="pt-4 space-y-3">
                    {entryUsage ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded border p-3">
                          <Activity className="size-4 mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Imports</p>
                          <p className="text-xl font-semibold">{entryUsage.importCount}</p>
                        </div>
                        <div className="rounded border p-3">
                          <Tag className="size-4 mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Ocorrências</p>
                          <p className="text-xl font-semibold">{entryUsage.totalOccurrences}</p>
                        </div>
                        <div className="rounded border p-3 col-span-2 space-y-1">
                          <Clock className="size-4 mb-1 text-muted-foreground" />
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Primeira utilização:</span>
                            <span>{entryUsage.firstUsedAt ?? "—"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Última utilização:</span>
                            <span>{entryUsage.lastUsedAt ?? "—"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Último ficheiro:</span>
                            <span>{entryUsage.lastFile ?? "—"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Última época:</span>
                            <span>{entryUsage.lastSeason ?? "—"}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem estatísticas de utilização registadas ainda.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="pt-4 space-y-2">
                    {entryChangelog.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem histórico de alterações registado.</p>
                    ) : (
                      <div className="space-y-2">
                        {entryChangelog.map((ev) => (
                          <div key={ev.id} className="flex gap-2 text-sm border-b pb-2 last:border-0">
                            <History className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{ev.eventType.replace(/_/g, " ")}</p>
                              {ev.note && <p className="text-muted-foreground text-xs">{ev.note}</p>}
                              {ev.oldValue && ev.newValue && (
                                <p className="text-xs text-muted-foreground">{ev.oldValue} → {ev.newValue}</p>
                              )}
                              <p className="text-xs text-muted-foreground">{ev.at}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="similar" className="pt-4 space-y-2">
                    {(() => {
                      const similar = findSimilarDictionaryEntries(detailEntry.name, entries, 8).filter(e => e.id !== detailEntry.id);
                      if (similar.length === 0) return <p className="text-sm text-muted-foreground">Nenhum campo semelhante encontrado.</p>;
                      return similar.map((e) => (
                        <div key={e.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{e.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{e.id}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{e.category}</Badge>
                        </div>
                      ));
                    })()}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editorMode === "create"
                ? "Nova Entrada"
                : editorMode === "duplicate"
                  ? "Duplicar Entrada"
                  : "Editar Entrada"}
            </SheetTitle>
            <SheetDescription>
              Gestao de metadados e aliases pela API publica do Dictionary.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-6">
            {editorWarnings.length > 0 && (
              <div className="rounded-md border border-amber-400/50 bg-amber-50/10 p-3 text-sm space-y-1">
                <div className="font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="size-4" />
                  Avisos de validacao
                </div>
                {editorWarnings.map((w, i) => (
                  <div key={`ew-${i}`}>{w}</div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Key *</Label>
                <Input
                  value={form.key}
                  disabled={editorMode === "edit"}
                  onChange={(e) => setField("key", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>ID</Label>
                <Input value={form.id ?? "(gerado automaticamente)"} disabled />
              </div>
              <div className="space-y-1">
                <Label>Abreviatura</Label>
                <Input
                  value={form.abbreviation}
                  onChange={(e) => setField("abbreviation", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Entity *</Label>
                <Select
                  value={form.entity}
                  onValueChange={(v) => setField("entity", v as DictionaryEntity)}
                  disabled={editorMode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Domain *</Label>
                <Select
                  value={form.domain}
                  onValueChange={(v) => setField("domain", v as DictionaryDomain)}
                  disabled={editorMode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoria *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setField("category", v as DictionaryCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {toTitle(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Import Group *</Label>
                <Select
                  value={form.importGroup}
                  onValueChange={(v) => setField("importGroup", v as DictionaryImportGroup)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORT_GROUP_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {toTitle(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Source</Label>
                <Input value={form.source} onChange={(e) => setField("source", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>OriginType</Label>
                <Select
                  value={form.originType}
                  onValueChange={(v) => setField("originType", v as DictionaryOriginType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGIN_TYPE_OPTIONS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {toTitle(x)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>DataType</Label>
                <Select
                  value={form.dataType}
                  onValueChange={(v) => setField("dataType", v as DictionaryDataType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPE_OPTIONS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* v2.0 KB fields */}
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5" /> Knowledge Base
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Estado (KB)</Label>
                <Select
                  value={form.status || "none"}
                  onValueChange={(v) =>
                    setField("status", v === "none" ? "" : (v as DictionaryStatus))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Sem estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem estado —</SelectItem>
                    <SelectItem value="official">Oficial</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="auto_discovered">Auto-descoberto</SelectItem>
                    <SelectItem value="ignored">Ignorado</SelectItem>
                    <SelectItem value="obsolete">Obsoleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subcategoria</Label>
                <Select
                  value={form.subcategory || "none"}
                  onValueChange={(v) =>
                    setField("subcategory", v === "none" ? "" : (v as DictionarySubcategory))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="mental">Mental</SelectItem>
                    <SelectItem value="physical">Físico</SelectItem>
                    <SelectItem value="goalkeeper">Guarda-redes</SelectItem>
                    <SelectItem value="passing">Passe</SelectItem>
                    <SelectItem value="shooting">Remate</SelectItem>
                    <SelectItem value="defending">Defesa</SelectItem>
                    <SelectItem value="possession">Posse</SelectItem>
                    <SelectItem value="goalkeeping">Guarda-redes (métrica)</SelectItem>
                    <SelectItem value="discipline">Disciplina</SelectItem>
                    <SelectItem value="creation">Criação</SelectItem>
                    <SelectItem value="progression">Progressão</SelectItem>
                    <SelectItem value="physical_metric">Físico (métrica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contextos de Import</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["import_players", "Jogadores"],
                    ["import_competitions", "Competições"],
                    ["import_coaches", "Treinadores"],
                    ["import_clubs", "Clubes"],
                    ["import_countries", "Países"],
                    ["import_international", "Internacional"],
                  ] as [DictionaryImportContext, string][]
                ).map(([ctx, label]) => (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => {
                      const next = form.importContexts.includes(ctx)
                        ? form.importContexts.filter((c) => c !== ctx)
                        : [...form.importContexts, ctx];
                      setField("importContexts", next);
                    }}
                    className={`rounded px-2 py-0.5 text-xs border transition-colors ${form.importContexts.includes(ctx) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Exemplos de valores</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={exampleInput}
                  onChange={(e) => setExampleInput(e.target.value)}
                  placeholder="ex: 12, 15, 18"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = exampleInput.trim();
                      if (v && !form.examples.includes(v)) {
                        setField("examples", [...form.examples, v]);
                        setExampleInput("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const v = exampleInput.trim();
                    if (v && !form.examples.includes(v)) {
                      setField("examples", [...form.examples, v]);
                      setExampleInput("");
                    }
                  }}
                >
                  +
                </Button>
              </div>
              {form.examples.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.examples.map((ex, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 text-xs rounded bg-muted px-1.5 py-0.5"
                    >
                      {ex}
                      <button
                        type="button"
                        onClick={() => setField("examples", form.examples.filter((_, j) => j !== i))}
                        className="ml-0.5 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Separator />

            <div className="space-y-2">
              <Label>Aliases</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="Novo alias"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAlias();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addAlias}>
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {form.aliases.map((alias, index) => (
                  <div key={`${index}-${alias}`} className="flex items-center gap-2">
                    <Input value={alias} onChange={(e) => updateAlias(index, e.target.value)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAlias(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {form.aliases.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem aliases definidos.</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label>Searchable</Label>
                <Switch
                  checked={form.searchable}
                  onCheckedChange={(v) => setField("searchable", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label>Visible</Label>
                <Switch checked={form.visible} onCheckedChange={(v) => setField("visible", v)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label>Deprecated</Label>
                <Switch
                  checked={form.deprecated}
                  onCheckedChange={(v) => setField("deprecated", v)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveEntry}>
                <Save className="size-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
