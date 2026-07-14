// Data Dictionary — tipos partilhados.
// Módulo totalmente isolado. Não altera qualquer motor existente.
//
// O Data Dictionary é o catálogo central da FM Platform. Todas as entradas
// (atributos, métricas, contextos, modificadores, etc.) partilham um conjunto
// de metadados comuns para permitir crescimento futuro sem alterações de API.

/** Tipos suportados pelo Data Dictionary (compatibilidade legada). */
export type EntryKind = "attribute" | "metric" | "context" | "modifier";

/** Categorias canónicas transversais ao importador e ao dicionário. */
export type DictionaryCategory =
  | "identifiers"
  | "profile_fields"
  | "attributes"
  | "metrics"
  | "contexts"
  | "ratings"
  | "modifiers"
  | "derived_fields"
  | "statistics"
  | "positions";

/** Entidade alvo da entrada. */
export type DictionaryEntityKind =
  "player" | "club" | "coach" | "competition" | "country" | "global";

/** Origem da entrada (raw = importado, derived = calculado). */
export type OriginType = "raw" | "derived";

/**
 * Metadados comuns a todas as entradas do Data Dictionary.
 * Todos os campos "novos" são opcionais para manter retro-compatibilidade
 * com os catálogos existentes.
 */
export interface DictionaryEntryBase {
  /** Identificador canónico único (ex.: "attribute.acceleration"). */
  id: string;
  /** Abreviatura curta (ex.: "ACC", "xG/90"). */
  shortName: string;
  /** Nome apresentado ao utilizador (PT-PT). */
  displayName: string;
  /** Nome oficial em inglês. */
  englishName: string;
  /** Todas as variantes reconhecidas (case/acentos/espaços ignorados). */
  aliases: string[];
  /** Unidade opcional (ex.: "%", "m", "s", "/90"). */
  unit?: string | null;

  // ── Metadados enriquecidos (opcionais) ─────────────────────────
  /** Descrição livre. */
  description?: string;
  /** Etiquetas livres para agrupamento (ex.: ["finishing", "attack"]). */
  tags?: string[];
  /** Entidades a que a entrada se aplica (ex.: ["player"]). */
  entityKinds?: string[];
  /** Origem lógica (ex.: "fm", "opta", "custom"). */
  source?: string;
  /** raw = importado do ficheiro, derived = calculado. */
  originType?: OriginType;
  /** Disponível na plataforma atualmente. */
  available?: boolean;
  /** Valor obtido por cálculo (não importado diretamente). */
  calculated?: boolean;
  /** Deve aparecer em UIs de descoberta (Data Dictionary Page). */
  discoverable?: boolean;
  /** Marcado como obsoleto — mantido para compatibilidade. */
  deprecated?: boolean;
  /** Versão do schema desta entrada. */
  version?: number;
}

// ─────────── Attributes ───────────

export type AttributeCategory = "technical" | "mental" | "physical" | "goalkeeping";

export interface AttributeDef extends DictionaryEntryBase {
  /** Discriminador de tipo — opcional para retro-compat, default "attribute". */
  kind?: "attribute";
  category: AttributeCategory;
  /** Ordem de apresentação dentro da categoria. */
  order: number;
}

// ─────────── Metrics ───────────

export type MetricCategory =
  | "attack"
  | "defense"
  | "distribution"
  | "possession"
  | "goalkeeping"
  | "discipline"
  | "physical"
  | "general";

export interface MetricDef extends DictionaryEntryBase {
  kind: "metric";
  category: MetricCategory;
}

// ─────────── Statistics (legado) ───────────

export type StatisticCategory =
  "attack" | "defense" | "distribution" | "goalkeeping" | "discipline" | "general";

export interface StatisticDef extends DictionaryEntryBase {
  kind?: "statistic";
  category: StatisticCategory;
}

// ─────────── Positions ───────────

export type PositionGroup = "goalkeeper" | "defender" | "midfielder" | "forward";

export interface PositionDef extends DictionaryEntryBase {
  kind?: "position";
  group: PositionGroup;
  /** Unidade não se aplica a posições — opcional. */
  unit?: string | null;
}

// ─────────── Contexts / Modifiers (future-proof) ───────────

export interface ContextDef extends DictionaryEntryBase {
  kind: "context";
  category?: string;
}

export interface ModifierDef extends DictionaryEntryBase {
  kind: "modifier";
  category?: string;
}

export type DictionaryEntry =
  AttributeDef | MetricDef | StatisticDef | PositionDef | ContextDef | ModifierDef;

/** Resultado do resolver unificado. */
export type ResolvedEntry =
  | { kind: "attribute"; entry: AttributeDef }
  | { kind: "metric"; entry: MetricDef }
  | { kind: "statistic"; entry: StatisticDef }
  | { kind: "position"; entry: PositionDef }
  | { kind: "context"; entry: ContextDef }
  | { kind: "modifier"; entry: ModifierDef };

/**
 * Formato canónico orientado ao Dicionário, usado pelo novo importador.
 * Mantém campos pedidos para evoluir sem hardcodes no parser.
 */
export interface DictionaryCatalogEntry {
  id: string;
  name: string;
  abbreviation: string;
  category: DictionaryCategory;
  entityKind: DictionaryEntityKind;
  description?: string;
  unit?: string | null;
  source?: string;
  originType?: OriginType;
  discoverable?: boolean;
  aliases: string[];
}

/** Entrada editável pela UI para gravar no dicionário customizado. */
export interface DictionaryCatalogDraft extends Omit<DictionaryCatalogEntry, "id"> {
  id?: string;
}
