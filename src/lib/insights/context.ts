// Construção do InsightContext a partir de fontes de dados fornecidas.
// Este ficheiro NÃO importa nada da app — recebe os dados como argumento
// para manter o motor 100% independente e testável.

import type { EntityRow, InsightContext, RankingSnapshot, RecordRow } from "./types";

export interface BuildContextInput {
  season?: string | null;
  rankings?: RankingSnapshot[];
  clubs?: EntityRow[];
  players?: EntityRow[];
  coaches?: EntityRow[];
  competitions?: EntityRow[];
  countries?: EntityRow[];
  records?: RecordRow[];
  meta?: Record<string, unknown>;
}

export function buildContext(input: BuildContextInput = {}): InsightContext {
  const rankings = input.rankings ?? [];
  const seasons = Array.from(new Set(rankings.map((r) => r.season))).sort();
  return {
    season: input.season ?? seasons[seasons.length - 1] ?? null,
    seasons,
    rankings,
    entities: {
      clubs: input.clubs ?? [],
      players: input.players ?? [],
      coaches: input.coaches ?? [],
      competitions: input.competitions ?? [],
      countries: input.countries ?? [],
    },
    records: input.records ?? [],
    meta: input.meta ?? {},
  };
}

/** Utilitário: agrupa snapshots por entidade e ordena por época ascendente. */
export function groupRankingsByEntity(
  rankings: RankingSnapshot[],
  scope: RankingSnapshot["scope"] = "global",
  scopeRef?: string | null,
): Map<string, RankingSnapshot[]> {
  const out = new Map<string, RankingSnapshot[]>();
  for (const r of rankings) {
    if (r.scope !== scope) continue;
    if (scopeRef != null && r.scopeRef !== scopeRef) continue;
    const arr = out.get(r.entityId) ?? [];
    arr.push(r);
    out.set(r.entityId, arr);
  }
  for (const arr of out.values()) arr.sort((a, b) => a.season.localeCompare(b.season));
  return out;
}

/** Utilitário: última e penúltima linha de ranking para uma entidade. */
export function lastTwo<T>(arr: T[]): { previous?: T; current?: T } {
  if (arr.length === 0) return {};
  if (arr.length === 1) return { current: arr[0] };
  return { previous: arr[arr.length - 2], current: arr[arr.length - 1] };
}
