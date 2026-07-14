/**
 * Canonical name resolver.
 *
 * Resolves human-readable names (e.g. "Finishing", "Finalização", "FIN",
 * "Goals/90", "Golos/90") to Score Engine internal IDs.
 * Never mutates the engine — only reads its catalogs.
 */
import {
  listAttributes,
  listContexts,
  listMetrics,
  listModifiers,
} from "../index";
import type { CanonicalRefKind, ResolutionCandidate } from "./types";

export function normalizeCanonicalToken(input: string): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/\\]+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

interface CatalogEntry {
  id: string;
  label: string;
  tokens: Set<string>;
}

interface CatalogIndex {
  entries: CatalogEntry[];
  byToken: Map<string, CatalogEntry[]>;
}

function metaField(meta: unknown, key: string): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function metaList(meta: unknown, key: string): string[] {
  if (!meta || typeof meta !== "object") return [];
  const value = (meta as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function idToKey(id: string): string {
  // "attribute.finishing" -> "finishing"; "metric.goals_per90" -> "goals per90"
  const parts = id.split(".");
  return (parts[parts.length - 1] ?? id).replace(/_/g, " ");
}

function buildCatalogIndex(items: Array<{ id: string; label?: string; metadata?: unknown }>): CatalogIndex {
  const entries: CatalogEntry[] = [];
  const byToken = new Map<string, CatalogEntry[]>();

  for (const item of items) {
    const meta = item.metadata;
    const label =
      metaField(meta, "name") ??
      item.label ??
      idToKey(item.id);
    const aliases = [
      label,
      item.label,
      metaField(meta, "name"),
      metaField(meta, "abbreviation"),
      idToKey(item.id),
      ...metaList(meta, "aliases"),
      ...metaList(meta, "tags"),
    ].filter((v): v is string => Boolean(v));

    const tokens = new Set<string>();
    for (const alias of aliases) {
      const t = normalizeCanonicalToken(alias);
      if (t) tokens.add(t);
    }
    const entry: CatalogEntry = { id: item.id, label, tokens };
    entries.push(entry);
    for (const t of tokens) {
      const bucket = byToken.get(t);
      if (bucket) bucket.push(entry);
      else byToken.set(t, [entry]);
    }
  }

  return { entries, byToken };
}

let cache: {
  attribute: CatalogIndex;
  metric: CatalogIndex;
  context: CatalogIndex;
  modifier: CatalogIndex;
} | null = null;

function getIndex(kind: CanonicalRefKind): CatalogIndex {
  if (!cache) {
    cache = {
      attribute: buildCatalogIndex(listAttributes()),
      metric: buildCatalogIndex(listMetrics()),
      context: buildCatalogIndex(listContexts()),
      modifier: buildCatalogIndex(listModifiers()),
    };
  }
  return cache[kind];
}

export function refreshCanonicalResolver(): void {
  cache = null;
}

// simple substring similarity for suggestions
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  // shared-prefix bonus
  let common = 0;
  const min = Math.min(a.length, b.length);
  while (common < min && a[common] === b[common]) common += 1;
  if (common < 3) return 0;
  return common / Math.max(a.length, b.length);
}

export interface ResolveOptions {
  suggestionLimit?: number;
  fuzzyThreshold?: number;
}

export interface ResolveOutcome {
  status: "resolved" | "ambiguous" | "unknown";
  matchedId?: string;
  matchedLabel?: string;
  candidates: ResolutionCandidate[];
}

export function resolveCanonicalName(
  kind: CanonicalRefKind,
  name: string,
  options: ResolveOptions = {},
): ResolveOutcome {
  const suggestionLimit = options.suggestionLimit ?? 3;
  const fuzzyThreshold = options.fuzzyThreshold ?? 0.55;
  const index = getIndex(kind);
  const token = normalizeCanonicalToken(name);

  if (!token) {
    return { status: "unknown", candidates: [] };
  }

  const exact = index.byToken.get(token);
  if (exact && exact.length === 1) {
    return {
      status: "resolved",
      matchedId: exact[0].id,
      matchedLabel: exact[0].label,
      candidates: [{ id: exact[0].id, label: exact[0].label, score: 1 }],
    };
  }
  if (exact && exact.length > 1) {
    return {
      status: "ambiguous",
      candidates: exact.map((e) => ({ id: e.id, label: e.label, score: 1 })),
    };
  }

  // fuzzy
  const scored: ResolutionCandidate[] = [];
  for (const entry of index.entries) {
    let best = 0;
    for (const t of entry.tokens) {
      const s = similarity(token, t);
      if (s > best) best = s;
    }
    if (best >= fuzzyThreshold) {
      scored.push({ id: entry.id, label: entry.label, score: best });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { status: "unknown", candidates: [] };
  }

  // If the top candidate is clearly ahead and above 0.9 -> auto-resolve.
  if (
    scored[0].score >= 0.9 &&
    (scored.length === 1 || scored[0].score - scored[1].score >= 0.1)
  ) {
    return {
      status: "resolved",
      matchedId: scored[0].id,
      matchedLabel: scored[0].label,
      candidates: scored.slice(0, suggestionLimit),
    };
  }

  return {
    status: scored[0].score >= 0.75 ? "ambiguous" : "unknown",
    candidates: scored.slice(0, suggestionLimit),
  };
}

export function labelForInternalId(kind: CanonicalRefKind, id: string): string {
  const idx = getIndex(kind);
  const found = idx.entries.find((e) => e.id === id);
  return found?.label ?? idToKey(id);
}
