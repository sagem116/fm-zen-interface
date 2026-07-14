// Registry central do Data Dictionary.
// Único ponto de acesso para atributos, métricas, estatísticas e posições.

import { ATTRIBUTES } from "./attributes";
import { METRICS } from "./metrics";
import { STATISTICS } from "./statistics";
import { POSITIONS } from "./positions";
import {
  buildAttributeIndex,
  buildMetricIndex,
  buildStatisticIndex,
  buildPositionIndex,
  normalizeKey,
} from "./resolver";
import type {
  AttributeDef,
  DictionaryCatalogDraft,
  DictionaryCatalogEntry,
  DictionaryCategory,
  DictionaryEntityKind,
  MetricDef,
  PositionDef,
  ResolvedEntry,
  StatisticDef,
} from "./types";
import {
  listDictionaryEntries as listDictionaryEntriesV2,
  listCustomDictionaryEntries as listCustomDictionaryEntriesV2,
  resolveDictionaryColumn as resolveDictionaryColumnV2,
  upsertDictionaryEntry,
} from "../dictionary";
import { fromLegacyCatalogDraft, toLegacyCatalogEntry } from "../dictionary/adapters";

const attrIndex = buildAttributeIndex(ATTRIBUTES);
const metricIndex = buildMetricIndex(METRICS);
const statIndex = buildStatisticIndex(STATISTICS);
const posIndex = buildPositionIndex(POSITIONS);

const CUSTOM_KEY = "fm-data-dictionary-custom-v1";

const CORE_PLAYER_ENTRIES: DictionaryCatalogEntry[] = [
  {
    id: "identifier.idu",
    name: "IDU",
    abbreviation: "IDU",
    category: "identifiers",
    entityKind: "player",
    description: "Identificador único do jogador no importador atual.",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["IDU", "UID", "ID"],
  },
  {
    id: "identifier.player_name",
    name: "Nome",
    abbreviation: "Nome",
    category: "identifiers",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Nome", "Name", "Jogador", "Player"],
  },
  {
    id: "identifier.uid_fm",
    name: "UID FM",
    abbreviation: "UID FM",
    category: "identifiers",
    entityKind: "player",
    description: "Identificador FM reservado para integração futura.",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["UID FM", "FM UID", "FM_ID"],
  },
  {
    id: "identifier.uid_db",
    name: "UID DB",
    abbreviation: "UID DB",
    category: "identifiers",
    entityKind: "player",
    description: "Identificador de base de dados reservado para integração futura.",
    source: "db",
    originType: "raw",
    discoverable: true,
    aliases: ["UID DB", "DB UID", "DB_ID"],
  },
  {
    id: "profile.age",
    name: "Idade",
    abbreviation: "Idade",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Idade", "Age"],
  },
  {
    id: "profile.nationality",
    name: "Nacionalidade",
    abbreviation: "Nac",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Nac", "Nacionalidade", "Nationality"],
  },
  {
    id: "profile.value",
    name: "Valor",
    abbreviation: "VP",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["VP", "Valor", "Valor de Mercado", "Market Value", "Value"],
  },
  {
    id: "profile.salary",
    name: "Salário",
    abbreviation: "Sal",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Salário", "Salario", "Salary", "Wage"],
  },
  {
    id: "profile.personality",
    name: "Personalidade",
    abbreviation: "Pers",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Personalidade", "Personality"],
  },
  {
    id: "profile.preferred_foot",
    name: "Pé Preferido",
    abbreviation: "Pé",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Pé", "Pe", "Pé Preferido", "Pe Preferido", "Preferred Foot", "Foot"],
  },
  {
    id: "profile.height",
    name: "Altura",
    abbreviation: "Alt",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Altura", "Height"],
  },
  {
    id: "profile.weight",
    name: "Peso",
    abbreviation: "Peso",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Peso", "Weight"],
  },
  {
    id: "profile.reputation",
    name: "Reputação",
    abbreviation: "Rep",
    category: "profile_fields",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Reputação", "Reputacao", "Reputation"],
  },
  {
    id: "context.club",
    name: "Clube",
    abbreviation: "Clube",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Clube", "Club", "Equipa", "Team"],
  },
  {
    id: "context.country",
    name: "País",
    abbreviation: "País",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["País", "Pais", "Country"],
  },
  {
    id: "context.competition",
    name: "Competição",
    abbreviation: "Comp",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Competição", "Competicao", "Competition", "Liga", "League"],
  },
  {
    id: "context.season",
    name: "Época",
    abbreviation: "Época",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Época", "Epoca", "Season", "Ano"],
  },
  {
    id: "context.continent",
    name: "Continente",
    abbreviation: "Cont",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Continente", "Continent"],
  },
  {
    id: "context.primary_position",
    name: "Posição Principal",
    abbreviation: "Pos",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: [
      "Posição",
      "Posicao",
      "Position",
      "Posição Principal",
      "Posicao Principal",
      "Primary Position",
      "Pos",
    ],
  },
  {
    id: "context.secondary_positions",
    name: "Posições Secundárias",
    abbreviation: "Pos Sec",
    category: "contexts",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["Posições Secundárias", "Posicoes Secundarias", "Secondary Positions", "Pos Sec"],
  },
  {
    id: "rating.ca",
    name: "C.A.",
    abbreviation: "CA",
    category: "ratings",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["CA", "C.A.", "Current Ability", "Currentability"],
  },
  {
    id: "rating.cp",
    name: "C.P.",
    abbreviation: "CP",
    category: "ratings",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["CP", "C.P.", "PA", "P.A.", "Potential Ability", "Potentialability"],
  },
  {
    id: "rating.ra",
    name: "R.A.",
    abbreviation: "RA",
    category: "ratings",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["RA", "R.A.", "Rating Average"],
  },
  {
    id: "rating.rm",
    name: "RM",
    abbreviation: "RM",
    category: "ratings",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["RM", "Rating Médio", "Rating Medio", "Average Rating"],
  },
  {
    id: "rating.rc",
    name: "RC",
    abbreviation: "RC",
    category: "ratings",
    entityKind: "player",
    source: "fm",
    originType: "raw",
    discoverable: true,
    aliases: ["RC", "Rating Clube", "Rating Club"],
  },
];

function toCatalogEntry(
  id: string,
  name: string,
  abbreviation: string,
  category: DictionaryCategory,
  entityKind: DictionaryEntityKind,
  aliases: string[],
  opts?: {
    description?: string;
    unit?: string | null;
    source?: string;
    originType?: "raw" | "derived";
    discoverable?: boolean;
  },
): DictionaryCatalogEntry {
  return {
    id,
    name,
    abbreviation,
    category,
    entityKind,
    aliases,
    description: opts?.description,
    unit: opts?.unit ?? null,
    source: opts?.source ?? "fm",
    originType: opts?.originType ?? "raw",
    discoverable: opts?.discoverable ?? true,
  };
}

function staticCatalogEntries(): DictionaryCatalogEntry[] {
  const attributes = ATTRIBUTES.map((a) =>
    toCatalogEntry(
      a.id,
      a.displayName,
      a.shortName,
      "attributes",
      "player",
      [a.id, a.displayName, a.englishName, a.shortName, ...a.aliases],
      {
        description: a.description,
        unit: a.unit ?? null,
        source: a.source ?? "fm",
        originType: a.originType ?? "raw",
        discoverable: a.discoverable ?? true,
      },
    ),
  );
  const metrics = METRICS.map((m) =>
    toCatalogEntry(
      m.id,
      m.displayName,
      m.shortName,
      "metrics",
      "player",
      [m.id, m.displayName, m.englishName, m.shortName, ...m.aliases],
      {
        description: m.description,
        unit: m.unit ?? null,
        source: m.source ?? "fm",
        originType: m.originType ?? "raw",
        discoverable: m.discoverable ?? true,
      },
    ),
  );
  const statistics = STATISTICS.map((s) =>
    toCatalogEntry(
      s.id,
      s.displayName,
      s.shortName,
      "statistics",
      "player",
      [s.id, s.displayName, s.englishName, s.shortName, ...s.aliases],
      {
        description: s.description,
        unit: s.unit ?? null,
        source: s.source ?? "fm",
        originType: s.originType ?? "raw",
        discoverable: s.discoverable ?? true,
      },
    ),
  );
  const positions = POSITIONS.map((p) =>
    toCatalogEntry(
      p.id,
      p.displayName,
      p.shortName,
      "positions",
      "player",
      [p.id, p.displayName, p.englishName, p.shortName, ...p.aliases],
      {
        description: p.description,
        source: p.source ?? "fm",
        originType: p.originType ?? "raw",
        discoverable: p.discoverable ?? true,
      },
    ),
  );
  return [...CORE_PLAYER_ENTRIES, ...attributes, ...metrics, ...statistics, ...positions];
}

function safeWindow(): Window | null {
  return typeof window !== "undefined" ? window : null;
}

function loadCustomEntries(): DictionaryCatalogEntry[] {
  try {
    const w = safeWindow();
    if (!w) return [];
    const raw = w.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DictionaryCatalogEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.id === "string" && typeof e.name === "string");
  } catch {
    return [];
  }
}

function saveCustomEntries(entries: DictionaryCatalogEntry[]) {
  try {
    const w = safeWindow();
    if (!w) return;
    w.localStorage.setItem(CUSTOM_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function defaultId(category: DictionaryCategory, name: string): string {
  const base = normalizeKey(name).replace(/[^a-z0-9]/g, "") || "field";
  return `${category}.${base}`;
}

export function listCustomDictionaryEntries(): DictionaryCatalogEntry[] {
  return listCustomDictionaryEntriesV2().map(toLegacyCatalogEntry);
}

export function upsertCustomDictionaryEntry(draft: DictionaryCatalogDraft): DictionaryCatalogEntry {
  const created = upsertDictionaryEntry(fromLegacyCatalogDraft(draft));
  return toLegacyCatalogEntry(created);
}

export function listDictionaryEntries(): DictionaryCatalogEntry[] {
  return listDictionaryEntriesV2().map(toLegacyCatalogEntry);
}

export function resolveDictionaryColumn(columnName: string): DictionaryCatalogEntry | null {
  const resolved = resolveDictionaryColumnV2(columnName);
  return resolved ? toLegacyCatalogEntry(resolved) : null;
}

// ─────────── Attributes ───────────
export function listAttributes(): AttributeDef[] {
  return [...ATTRIBUTES];
}
export function getAttribute(id: string): AttributeDef | null {
  return attrIndex.byId.get(id) ?? null;
}
export function resolveAttribute(name: string): AttributeDef | null {
  return attrIndex.byAlias.get(normalizeKey(name)) ?? null;
}
export function resolveAttributeId(name: string): string | null {
  return resolveAttribute(name)?.id ?? null;
}

// ─────────── Metrics ───────────
export function listMetrics(): MetricDef[] {
  return [...METRICS];
}
export function getMetric(id: string): MetricDef | null {
  return metricIndex.byId.get(id) ?? null;
}
export function resolveMetric(name: string): MetricDef | null {
  return metricIndex.byAlias.get(normalizeKey(name)) ?? null;
}
export function resolveMetricId(name: string): string | null {
  return resolveMetric(name)?.id ?? null;
}

// ─────────── Statistics (legado) ───────────
export function listStatistics(): StatisticDef[] {
  return [...STATISTICS];
}
export function getStatistic(id: string): StatisticDef | null {
  return statIndex.byId.get(id) ?? null;
}
export function resolveStatistic(name: string): StatisticDef | null {
  return statIndex.byAlias.get(normalizeKey(name)) ?? null;
}
export function resolveStatisticId(name: string): string | null {
  return resolveStatistic(name)?.id ?? null;
}

// ─────────── Positions ───────────
export function listPositions(): PositionDef[] {
  return [...POSITIONS];
}
export function getPosition(id: string): PositionDef | null {
  return posIndex.byId.get(id) ?? null;
}
export function resolvePosition(name: string): PositionDef | null {
  return posIndex.byAlias.get(normalizeKey(name)) ?? null;
}
export function resolvePositionId(name: string): string | null {
  return resolvePosition(name)?.id ?? null;
}

// ─────────── Resolver unificado ───────────

/**
 * Devolve o identificador canónico para o nome de uma coluna importada.
 * A ordem de resolução é: attribute → metric → statistic → position.
 */
export function normalizeColumnName(columnName: string): string | null {
  const k = normalizeKey(columnName);
  if (!k) return null;
  return (
    attrIndex.byAlias.get(k)?.id ??
    metricIndex.byAlias.get(k)?.id ??
    statIndex.byAlias.get(k)?.id ??
    posIndex.byAlias.get(k)?.id ??
    null
  );
}

/**
 * Resolver central: devolve a entrada e o respetivo `kind`. É a única forma
 * correta de o parser decidir a que grupo pertence uma coluna.
 */
export function resolveColumnName(columnName: string): ResolvedEntry | null {
  const k = normalizeKey(columnName);
  if (!k) return null;
  const a = attrIndex.byAlias.get(k);
  if (a) return { kind: "attribute", entry: a };
  const mt = metricIndex.byAlias.get(k);
  if (mt) return { kind: "metric", entry: mt };
  const s = statIndex.byAlias.get(k);
  if (s) return { kind: "statistic", entry: s };
  const p = posIndex.byAlias.get(k);
  if (p) return { kind: "position", entry: p };
  return null;
}
