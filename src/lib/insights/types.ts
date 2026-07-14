// Insight Engine — Fase 1
// Tipos fundamentais. Módulo totalmente independente. Sem dependências externas.
// Não altera Rankings, Scores, Perfil Inteligente nem Base de Dados.

export type InsightCategory =
  | "rankings"
  | "evolution"
  | "records"
  | "competitions"
  | "countries"
  | "clubs"
  | "players"
  | "coaches"
  | "trends";

export type EntityKind =
  "club" | "player" | "coach" | "competition" | "country" | "continent" | "global";

export interface InsightEntity {
  kind: EntityKind;
  id: string;
  name: string;
}

/** Peso da relevância editorial do insight (0–100). */
export type Importance = number;
/** Fiabilidade dos dados usados (0–1). */
export type Confidence = number;

/** Evidência bruta e auditável usada para gerar o insight. */
export interface InsightEvidence {
  metric: string;
  previous?: number | string | null;
  current?: number | string | null;
  delta?: number | null;
  window?: string;
  ref?: string;
  [key: string]: unknown;
}

export interface Insight {
  id: string;
  category: InsightCategory;
  type: string;
  entity: InsightEntity;
  importance: Importance;
  confidence: Confidence;
  season?: string | null;
  title: string;
  description: string;
  evidence: InsightEvidence[];
  data: Record<string, unknown>;
  detector: string;
  generatedAt: string;
}

/** Contexto de leitura passado a cada detector. Ver context.ts. */
export interface InsightContext {
  season?: string | null;
  seasons: string[];
  rankings: RankingSnapshot[];
  entities: {
    clubs: EntityRow[];
    players: EntityRow[];
    coaches: EntityRow[];
    competitions: EntityRow[];
    countries: EntityRow[];
  };
  records: RecordRow[];
  meta: Record<string, unknown>;
}

export interface EntityRow {
  id: string;
  name: string;
  country?: string | null;
  continent?: string | null;
  extra?: Record<string, unknown>;
}

/** Uma linha de ranking numa dada época/competição. */
export interface RankingSnapshot {
  entityId: string;
  entityKind: EntityKind;
  scope: "global" | "continental" | "national" | "competition";
  scopeRef?: string | null;
  season: string;
  position: number;
  score?: number | null;
}

export interface RecordRow {
  entityId: string;
  entityKind: EntityKind;
  metric: string;
  value: number;
  season?: string | null;
  ref?: string | null;
}

export interface Detector {
  readonly id: string;
  readonly category: InsightCategory;
  run(ctx: InsightContext): Insight[] | Promise<Insight[]>;
}

export interface EngineOptions {
  /** Se definido, apenas detectores com estes IDs correm. */
  only?: string[];
  /** Filtra detectores por categoria. */
  categories?: InsightCategory[];
  /** Limite superior de insights devolvidos (após ordenação por importância). */
  limit?: number;
  /** Se true, propaga erros de detectores; caso contrário, isolados. */
  strict?: boolean;
}

export interface EngineRunReport {
  insights: Insight[];
  ranByDetector: Record<string, number>;
  errors: Array<{ detector: string; error: string }>;
  durationMs: number;
}
