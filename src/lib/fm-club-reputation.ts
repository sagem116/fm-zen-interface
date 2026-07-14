// Club reputation + name-alias system (localStorage backed).
// Lets the user import an XLSX with full club names + reputation, normalize
// the names against the canonical list used elsewhere, and feed a "Reputação"
// column into rankings.
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const REP_KEY = "fm-club-reputation-v1";
const ALIAS_KEY = "fm-club-name-aliases-v1";
const IMPORTS_KEY = "fm-club-reputation-imports-v1";
const EVT = "fm:club-reputation-changed";

type Dict<T> = Record<string, T>;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore */
  }
}

export function loadReputations(): Dict<number> {
  return read<Dict<number>>(REP_KEY, {});
}
export function saveReputations(r: Dict<number>) {
  write(REP_KEY, r);
}
export function getReputation(canonical: string): number | null {
  const r = loadReputations();
  const v = r[canonical];
  return typeof v === "number" ? v : null;
}
export function setReputation(canonical: string, value: number) {
  const r = loadReputations();
  r[canonical] = value;
  saveReputations(r);
}
export function removeReputation(canonical: string) {
  const r = loadReputations();
  delete r[canonical];
  saveReputations(r);
}

export function loadClubAliases(): Dict<string> {
  return read<Dict<string>>(ALIAS_KEY, {});
}
export function saveClubAliases(a: Dict<string>) {
  write(ALIAS_KEY, a);
}
export function setClubAlias(raw: string, canonical: string) {
  const a = loadClubAliases();
  a[raw] = canonical;
  saveClubAliases(a);
}
export function removeClubAlias(raw: string) {
  const a = loadClubAliases();
  delete a[raw];
  saveClubAliases(a);
}

// ---------- Import history ----------

export interface ReputationImportRecord {
  id: string;
  created_at: string;
  year: number;
  filename: string;
  entries: Record<string, number>; // canonical -> reputation
  aliasesAdded: Record<string, string>; // raw -> canonical
  unmatched?: Record<string, number>; // raw -> reputation (when saved as-is)
}

export function loadReputationImports(): ReputationImportRecord[] {
  const list = read<ReputationImportRecord[]>(IMPORTS_KEY, []);
  return Array.isArray(list) ? list : [];
}
function saveReputationImports(list: ReputationImportRecord[]) {
  write(IMPORTS_KEY, list);
}

/** Rebuild reps + aliases from the full import history (chronological, latest wins). */
function rebuildFromImports(imports: ReputationImportRecord[]): {
  reps: Dict<number>;
  aliases: Dict<string>;
} {
  const reps: Dict<number> = {};
  const aliases: Dict<string> = {};
  const sorted = [...imports].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const imp of sorted) {
    for (const [club, value] of Object.entries(imp.entries || {})) reps[club] = value;
    for (const [raw, canonical] of Object.entries(imp.aliasesAdded || {})) aliases[raw] = canonical;
    if (imp.unmatched) for (const [raw, value] of Object.entries(imp.unmatched)) reps[raw] = value;
  }
  return { reps, aliases };
}

export function deleteReputationImport(id: string) {
  const imports = loadReputationImports().filter((i) => i.id !== id);
  saveReputationImports(imports);
  const { reps, aliases } = rebuildFromImports(imports);
  saveReputations(reps);
  saveClubAliases(aliases);
}

export function onReputationChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

const NOISE = new Set([
  "fc",
  "cf",
  "sc",
  "ac",
  "ec",
  "afc",
  "cfc",
  "rc",
  "ud",
  "cd",
  "ca",
  "club",
  "clube",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "the",
  "el",
  "la",
  "le",
  "los",
  "las",
  "und",
  "and",
  "y",
  "e",
  "sport",
  "sports",
  "sad",
  "ltd",
  "futebol",
  "football",
  "athletic",
  "atletico",
  "atlético",
  "real",
  "fk",
  "if",
  "bk",
  "vfb",
  "vfl",
  "sv",
  "tsg",
  "tsv",
  "vv",
  "fsv",
  "1",
  "1899",
  "1900",
  "1901",
  "1902",
  "1903",
  "1904",
  "1905",
  "1906",
  "1907",
  "1908",
]);

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCore(s: string): string {
  return normalizeName(s)
    .split(" ")
    .filter((w) => w && !NOISE.has(w))
    .join(" ");
}

export interface MatchResult {
  canonical: string;
  reason: "alias" | "exact" | "core" | "contains";
}

export function buildClubMatcher(knownClubs: string[]) {
  const exact = new Map<string, string>();
  const core = new Map<string, string>();
  for (const c of knownClubs) {
    const n = normalizeName(c);
    if (n && !exact.has(n)) exact.set(n, c);
    const cn = normalizeCore(c);
    if (cn && !core.has(cn)) core.set(cn, c);
  }
  const aliases = loadClubAliases();
  return (raw: string): MatchResult | null => {
    if (!raw) return null;
    if (aliases[raw]) return { canonical: aliases[raw], reason: "alias" };
    const n = normalizeName(raw);
    const e = exact.get(n);
    if (e) return { canonical: e, reason: "exact" };
    const cn = normalizeCore(raw);
    if (cn) {
      const c = core.get(cn);
      if (c) return { canonical: c, reason: "core" };
      // partial / contains (require at least 4 chars overlap on each side)
      let best: { canonical: string; score: number } | null = null;
      for (const [k, v] of core) {
        if (!k || k.length < 4 || cn.length < 4) continue;
        if (k === cn) continue;
        if (k.includes(cn) || cn.includes(k)) {
          const score = Math.min(k.length, cn.length);
          if (!best || score > best.score) best = { canonical: v, score };
        }
      }
      if (best) return { canonical: best.canonical, reason: "contains" };
    }
    return null;
  };
}

export interface ReputationParseRow {
  raw: string;
  reputation: number;
}

export interface ReputationImportResult {
  matched: { raw: string; canonical: string; reputation: number; reason: MatchResult["reason"] }[];
  unmatched: ReputationParseRow[];
  total: number;
}

function normHeader(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseClubReputationWorkbook(buffer: ArrayBuffer): ReputationParseRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const out: ReputationParseRow[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (!matrix.length) continue;
    const headers = (matrix[0] ?? []) as unknown[];
    let clubIdx = -1;
    let repIdx = -1;
    headers.forEach((h, i) => {
      const n = normHeader(h);
      if (/(clube|club|nome|name|equipa|team)/.test(n) && clubIdx === -1) clubIdx = i;
      if (/reputa/.test(n) && repIdx === -1) repIdx = i;
    });
    if (clubIdx === -1) clubIdx = 0;
    if (repIdx === -1) repIdx = 1;
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r] as unknown[];
      if (!row) continue;
      const raw = String(row[clubIdx] ?? "").trim();
      if (!raw) continue;
      const rep = Number(String(row[repIdx] ?? "").replace(",", "."));
      if (!Number.isFinite(rep)) continue;
      out.push({ raw, reputation: rep });
    }
  }
  return out;
}

export function matchReputations(
  rows: ReputationParseRow[],
  knownClubs: string[],
): ReputationImportResult {
  const matcher = buildClubMatcher(knownClubs);
  const matched: ReputationImportResult["matched"] = [];
  const unmatched: ReputationParseRow[] = [];
  for (const r of rows) {
    const m = matcher(r.raw);
    if (m)
      matched.push({
        raw: r.raw,
        canonical: m.canonical,
        reputation: r.reputation,
        reason: m.reason,
      });
    else unmatched.push(r);
  }
  return { matched, unmatched, total: rows.length };
}

export function applyReputationImport(
  result: ReputationImportResult,
  opts: { saveUnmatched?: boolean; year?: number; filename?: string } = {},
) {
  const reps = loadReputations();
  const aliases = loadClubAliases();
  const entries: Record<string, number> = {};
  const aliasesAdded: Record<string, string> = {};
  for (const { raw, canonical, reputation, reason } of result.matched) {
    reps[canonical] = reputation;
    entries[canonical] = reputation;
    // Persist alias when source name differs from canonical (skip pure alias-hits to avoid noise).
    if (raw !== canonical && reason !== "alias") {
      aliases[raw] = canonical;
      aliasesAdded[raw] = canonical;
    }
  }
  const unmatched: Record<string, number> = {};
  if (opts.saveUnmatched) {
    for (const { raw, reputation } of result.unmatched) {
      reps[raw] = reputation;
      unmatched[raw] = reputation;
    }
  }
  saveReputations(reps);
  saveClubAliases(aliases);
  // Log import
  if (opts.year !== undefined || opts.filename !== undefined) {
    const list = loadReputationImports();
    list.push({
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
      year: opts.year ?? new Date().getFullYear(),
      filename: opts.filename ?? "—",
      entries,
      aliasesAdded,
      unmatched: opts.saveUnmatched ? unmatched : undefined,
    });
    saveReputationImports(list);
  }
}

async function ensureSeasonId(year: number): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const existing = await sb.from("seasons").select("id").eq("year", year).maybeSingle();
  if (existing.error) throw new Error(`seasons lookup: ${existing.error.message}`);
  if (existing.data?.id) return existing.data.id as string;
  const ins = await sb
    .from("seasons")
    .insert({ year, label: String(year) })
    .select("id")
    .single();
  if (ins.error) throw new Error(`seasons insert: ${ins.error.message}`);
  return ins.data.id as string;
}

export interface ClubRepDbImportReport {
  updated: string[];
  notFound: string[];
  skipped: Array<{ raw: string; reason: string }>;
}

export async function persistClubReputationToDb(
  result: ReputationImportResult,
  year: number,
): Promise<ClubRepDbImportReport> {
  const updated: string[] = [];
  const notFound: string[] = [];
  const skipped: Array<{ raw: string; reason: string }> = [];

  const seasonId = await ensureSeasonId(year);

  // Build list of canonical names to resolve to club ids
  const names = result.matched.map((m) => m.canonical);
  if (!names.length) return { updated, notFound: result.unmatched.map((u) => u.raw), skipped };

  // Fetch club ids for these names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clubRows, error: clubErr } = await (supabase as any)
    .from("clubs")
    .select("id,name")
    .in("name", names);
  if (clubErr) throw new Error(`clubs lookup: ${clubErr.message}`);
  const clubMap = new Map<string, string>();
  for (const c of (clubRows ?? []) as Array<{ id: string; name: string }>) clubMap.set(c.name, c.id);

  // Prepare upsert payload: upsert per club (season_id, season_year, club_name, club_id, reputation)
  const payload: Record<string, unknown>[] = [];
  for (const m of result.matched) {
    const clubId = clubMap.get(m.canonical) ?? null;
    if (!clubId) {
      notFound.push(m.canonical);
      skipped.push({ raw: m.raw, reason: "Club not found in DB" });
      continue;
    }
    payload.push({
      season_id: seasonId,
      season_year: year,
      club_name: m.canonical,
      club_id: clubId,
      reputation: m.reputation,
    });
    updated.push(m.canonical);
  }

  if (payload.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("club_reputation_season").upsert(payload, {
      onConflict: ["season_id", "club_name"],
    });
    if (error) throw new Error(`club_reputation_season upsert: ${error.message}`);
  }

  return { updated, notFound, skipped };
}

/** Resolve a club name (anywhere in the app) to its stored reputation, honoring aliases. */
export function reputationFor(
  club: string | null | undefined,
  aliases: Dict<string> = loadClubAliases(),
  reps: Dict<number> = loadReputations(),
): number | null {
  if (!club) return null;
  const direct = reps[club];
  if (typeof direct === "number") return direct;
  const aliased = aliases[club];
  if (aliased) {
    const v = reps[aliased];
    if (typeof v === "number") return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Single source of truth hydration
// ---------------------------------------------------------------------------
// `club_reputation_season` (Supabase) is the canonical store for club
// reputation. The `fm-club-reputation-v1` localStorage map is a synchronous
// mirror of that table, keyed by canonical club name and holding the value
// from the most recent season available for each club. Hydration runs on
// app boot (AppShell), after every import (V2 + manual) and on demand.

let hydratePromise: Promise<Dict<number>> | null = null;

export async function hydrateClubReputationsFromDb(): Promise<Dict<number>> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("club_reputation_season")
        .select("club_name, season_year, reputation");
      if (error) return loadReputations();
      const rows = (data ?? []) as Array<{
        club_name: string;
        season_year: number | null;
        reputation: number | null;
      }>;
      // Latest season per club wins.
      const latest = new Map<string, { year: number; value: number }>();
      for (const r of rows) {
        if (!r.club_name || r.reputation == null) continue;
        const y = Number(r.season_year ?? 0);
        const cur = latest.get(r.club_name);
        if (!cur || y >= cur.year) {
          latest.set(r.club_name, { year: y, value: Number(r.reputation) });
        }
      }
      const next: Dict<number> = {};
      for (const [name, v] of latest) next[name] = v.value;
      saveReputations(next);
      return next;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}
