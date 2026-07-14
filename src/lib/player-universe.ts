import { useMemo } from "react";
import type { PlayerProfileDataRow } from "./usePlayerProfilesData";
import { usePlayerProfilesData } from "./usePlayerProfilesData";

export interface PlayerUniverseHistoryPoint {
  season: number;
  ca?: number | null;
  cp?: number | null;
  value?: number | null;
  salary?: number | null;
  reputation?: number | null;
  metrics?: Record<string, number>;
  extras?: Record<string, unknown>;
}

export interface PlayerUniverseEntry {
  uid: string; // idu if present, otherwise fallback to row.id
  idu?: string | null;
  ids: string[]; // all row ids mapped to this uid
  name: string; // latest player_name
  currentClub?: string | null;
  country?: string | null;
  age?: number | null;
  ca?: number | null;
  pa?: number | null;
  seasonYear?: number;
  attributes?: Record<string, unknown>;
  extras?: Record<string, unknown>;
  rawProfiles: PlayerProfileDataRow[]; // all rows grouped
  history: Record<number, PlayerUniverseHistoryPoint>;
}

function normalizeName(n?: string | null) {
  return (n ?? "").trim().toLowerCase();
}

export function buildPlayerUniverseFromProfiles(rows: PlayerProfileDataRow[] = []): Record<string, PlayerUniverseEntry> {
  // Group rows by UID (idu) or fallback to row.id
  const byUid: Record<string, PlayerProfileDataRow[]> = {};

  const sorted = rows.slice().sort((a, b) => (b.season_year ?? 0) - (a.season_year ?? 0));

  for (const row of sorted) {
    const uid = row.idu ?? row.id ?? row.player_name;
    if (!uid) continue;
    if (!byUid[uid]) byUid[uid] = [];
    byUid[uid].push(row);
  }

  const out: Record<string, PlayerUniverseEntry> = {};

  for (const [uid, group] of Object.entries(byUid)) {
    const primary = group[0]; // most recent season (sorted)
    const ids = Array.from(new Set(group.map((r) => r.id)));
    const attributes = (primary.attributes as Record<string, unknown> | null) ?? {};
    const extras = (primary.extras as Record<string, unknown> | null) ?? {};

    const history: Record<number, PlayerUniverseHistoryPoint> = {};
    for (const row of group) {
      const season = row.season_year;
      const extrasRow = (row.extras as Record<string, unknown> | null) ?? {};
      const metricsRaw = (extrasRow.metrics as Record<string, unknown> | null) ?? {};
      const metrics: Record<string, number> = {};
      for (const [k, v] of Object.entries(metricsRaw)) {
        const n = Number(v as any);
        if (Number.isFinite(n)) metrics[k] = n;
      }
      history[season] = {
        season,
        ca: row.ca ?? null,
        cp: row.cp ?? null,
        value: row.vp ?? null,
        salary: row.salary ?? null,
        reputation: row.reputation ?? null,
        metrics,
        extras: extrasRow,
      };
    }

    out[uid] = {
      uid,
      idu: primary.idu ?? null,
      ids,
      name: primary.player_name,
      currentClub: primary.club ?? null,
      country: primary.country ?? null,
      age: primary.age ?? null,
      ca: primary.ca ?? null,
      pa: primary.cp ?? primary.cp ?? null,
      seasonYear: primary.season_year ?? undefined,
      attributes,
      extras,
      rawProfiles: group,
      history,
    };
  }

  return out;
}

export function usePlayerUniverse(module?: string) {
  const profiles = usePlayerProfilesData(module as any);

  const universe = useMemo(() => {
    if (!profiles.data) {
      return {
        byUid: {} as Record<string, PlayerUniverseEntry>,
        list: [] as PlayerUniverseEntry[],
        byName: {} as Record<string, string>,
        byIdu: {} as Record<string, string>,
        byNormalizedName: {} as Record<string, string>,
        byClub: {} as Record<string, string[]>,
        byCountry: {} as Record<string, string[]>,
      };
    }

    const byUid = buildPlayerUniverseFromProfiles(profiles.data as PlayerProfileDataRow[]);
    const list = Object.values(byUid);
    const byName: Record<string, string> = {};
    const byIdu: Record<string, string> = {};
    const byNormalizedName: Record<string, string> = {};
    const byClub: Record<string, string[]> = {};
    const byCountry: Record<string, string[]> = {};

    for (const entry of list) {
      const key = normalizeName(entry.name);
      if (!byName[entry.uid]) byName[entry.uid] = entry.uid;
      if (entry.idu) byIdu[String(entry.idu)] = entry.uid;
      if (!byNormalizedName[key]) byNormalizedName[key] = entry.uid;
      if (entry.currentClub) {
        const c = entry.currentClub;
        byClub[c] = byClub[c] ?? [];
        if (!byClub[c].includes(entry.uid)) byClub[c].push(entry.uid);
      }
      if (entry.country) {
        const co = entry.country;
        byCountry[co] = byCountry[co] ?? [];
        if (!byCountry[co].includes(entry.uid)) byCountry[co].push(entry.uid);
      }
    }

    return { byUid, list, byName, byIdu, byNormalizedName, byClub, byCountry };
  }, [profiles.data]);

  return {
    isLoading: profiles.isLoading,
    byUid: universe.byUid,
    list: universe.list,
    uidByName: universe.byName,
    uidByIdu: universe.byIdu,
    uidByNormalizedName: universe.byNormalizedName,
    uidsByClub: universe.byClub,
    uidsByCountry: universe.byCountry,
    getByUid: (uid?: string | null) => (uid ? universe.byUid[uid] ?? null : null),
    getByIdu: (idu?: string | null) => (idu ? universe.byUid[universe.byIdu[idu]] ?? null : null),
    getByName: (name?: string | null) => (name ? universe.byUid[universe.byNormalizedName[normalizeName(name)]] ?? null : null),
  };
}
