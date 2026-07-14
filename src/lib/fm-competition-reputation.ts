// Manual reputation per competition, persisted in Supabase
// (table public.competition_reputation) with a localStorage cache so the
// rest of the app can read synchronously without firing extra queries.
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "fm-competition-reputation-cache-v1";
const EVT = "fm:competition-reputation-changed";

export type CompReputationMap = Record<string, number>;

function readCache(): CompReputationMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CompReputationMap) : {};
  } catch {
    return {};
  }
}

function writeCache(map: CompReputationMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* noop */
  }
}

export function loadCompetitionReputationsSync(): CompReputationMap {
  return readCache();
}

export async function loadCompetitionReputations(): Promise<CompReputationMap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("competition_reputation")
    .select("competition, season_year, reputation");
  if (error) {
    // fall back to cache (offline or first run)
    return readCache();
  }
  const map: CompReputationMap = {};
  // Latest season per competition wins so multi-season imports don't collide.
  const latest = new Map<string, { year: number; value: number }>();
  for (const r of (data ?? []) as Array<{
    competition: string;
    season_year: number | null;
    reputation: number;
  }>) {
    if (!r.competition || r.reputation == null) continue;
    const y = Number(r.season_year ?? 0);
    const cur = latest.get(r.competition);
    if (!cur || y >= cur.year) {
      latest.set(r.competition, { year: y, value: Number(r.reputation) });
    }
  }
  for (const [k, v] of latest) map[k] = v.value;
  writeCache(map);
  return map;
}

/**
 * Hydrate the localStorage cache from Supabase. Alias for
 * `loadCompetitionReputations` kept for symmetry with the club-side helper.
 */
export async function hydrateCompetitionReputationsFromDb(): Promise<CompReputationMap> {
  return loadCompetitionReputations();
}

export async function setCompetitionReputation(competition: string, reputation: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("competition_reputation")
    .upsert({ competition, reputation });
  if (error) throw new Error(error.message);
  const next = { ...readCache(), [competition]: reputation };
  writeCache(next);
}

export async function deleteCompetitionReputation(competition: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("competition_reputation")
    .delete()
    .eq("competition", competition);
  if (error) throw new Error(error.message);
  const cur = readCache();
  delete cur[competition];
  writeCache(cur);
}

export function onCompetitionReputationChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}

// ---- Full per-season rows (with country/continent) ----------------------
export interface CompReputationSeasonRow {
  competition: string;
  season_year: number | null;
  reputation: number;
  country: string | null;
  continent: string | null;
}

export async function loadCompetitionReputationRows(): Promise<CompReputationSeasonRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("competition_reputation")
    .select("competition, season_year, reputation, country, continent");
  if (error) return [];
  return (data ?? []) as CompReputationSeasonRow[];
}
