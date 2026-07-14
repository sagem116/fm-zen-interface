import { supabase } from "@/integrations/supabase/client";
import { buildBackup } from "@/lib/fm-global-backup";
import type { SectionKey } from "./section-catalog";

export interface ExportSelection {
  sections: Record<SectionKey, boolean>;
  seasons: "all" | string[]; // season ids ("all" = todas)
  compress: boolean;
}

export interface GlobalExport {
  metadata: {
    exportedAt: string;
    appVersion: string;
    schemaVersion: number;
    counts: Record<string, number>;
    selection: Record<SectionKey, boolean>;
    seasons: "all" | string[];
  };
  settings?: unknown;
  dictionary?: unknown;
  scoreStudio?: unknown;
  intelligenceStudio?: unknown;
  imports?: unknown[];
  entities?: {
    players?: unknown[];
    clubs?: unknown[];
    coaches?: unknown[];
    competitions?: unknown[];
    countries?: unknown[];
    continents?: unknown[];
  };
  standings?: unknown[];
  statistics?: unknown[];
  rankings?: unknown[];
  scores?: unknown[];
  career?: unknown;
  challenges?: unknown;
  achievements?: unknown;
  hallOfFame?: unknown[];
  history?: unknown[];
  snapshots?: unknown[];
  cache?: unknown;
}

const SCHEMA_VERSION = 1;

function readLocal<T = unknown>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function fetchAll(
  table: string,
  seasonCol: string | null,
  seasons: "all" | string[],
): Promise<any[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (supabase as any).from(table).select("*");
    if (seasonCol && seasons !== "all" && seasons.length) {
      q = q.in(seasonCol, seasons);
    }
    const { data, error } = await q;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function buildGlobalExport(sel: ExportSelection): Promise<GlobalExport> {
  const s = sel.sections;
  const backup = buildBackup();
  const buckets = backup.buckets ?? {};

  const out: GlobalExport = {
    metadata: {
      exportedAt: new Date().toISOString(),
      appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev",
      schemaVersion: SCHEMA_VERSION,
      counts: {},
      selection: sel.sections,
      seasons: sel.seasons,
    },
  };

  // ---- Client-side (localStorage) sections ----
  if (s.settings)
    out.settings = {
      ui: buckets.ui,
      geo: buckets.geo,
      reputation: buckets.reputation,
      clubMap: buckets.clubMap,
    };
  if (s.dictionary) out.dictionary = readLocal("fm-dictionary-v1") ?? null;
  if (s.scoreStudio) out.scoreStudio = readLocal("fm-score-studio-v1") ?? null;
  if (s.intelligenceStudio) out.intelligenceStudio = readLocal("fm-intelligence-studio-v1") ?? null;
  if (s.weights)
    ((out.metadata.counts.weights = 1),
      ((out as unknown as Record<string, unknown>).weights = buckets.weights));
  if (s.customRankings)
    (out as unknown as Record<string, unknown>).customRankings =
      readLocal("fm-custom-rankings-v1") ?? null;
  if (s.formulas)
    (out as unknown as Record<string, unknown>).formulas =
      readLocal("fm-custom-formulas-v1") ?? null;
  if (s.favorites)
    (out as unknown as Record<string, unknown>).favorites =
      readLocal("fm-saved-filters-v1") ?? null;
  if (s.layout) (out as unknown as Record<string, unknown>).layout = buckets.ui;
  if (s.preferences)
    (out as unknown as Record<string, unknown>).preferences = {
      sidebar: readLocal("fm-sidebar-prefs-v1"),
      theme: readLocal("fm-theme"),
    };
  if (s.snapshots)
    out.snapshots = (readLocal<unknown[]>("fm-insights-snapshots-v1") ?? []) as unknown[];
  if (s.challenges) out.challenges = readLocal("fm-desafios-v2") ?? null;
  if (s.achievements) out.achievements = readLocal("fm-highlights-v1") ?? null;
  if (s.career) out.career = readLocal("fm-career-v1") ?? null;

  // ---- Supabase sections ----
  const seasons = sel.seasons;

  if (s.imports) out.imports = await fetchAll("imports", "season_id", seasons);
  if (s.players || s.clubs || s.coaches || s.competitions || s.countries || s.continents) {
    out.entities = {};
    if (s.players) out.entities.players = await fetchAll("players", null, "all");
    if (s.clubs) out.entities.clubs = await fetchAll("clubs", null, "all");
    if (s.coaches) out.entities.coaches = await fetchAll("coaches", null, "all");
    if (s.competitions) {
      // "competitions" não existe como tabela — reunir da competition_reputation + competition_stats
      const [rep, stats] = await Promise.all([
        fetchAll("competition_reputation", "season_id", seasons),
        fetchAll("competition_stats", "season_id", seasons),
      ]);
      out.entities.competitions = [...rep, ...stats];
    }
    if (s.countries) out.entities.countries = await fetchAll("countries", null, "all");
    if (s.continents) out.entities.continents = []; // continentes são derivados de countries
  }

  if (s.standings) out.standings = await fetchAll("standings", "season_id", seasons);
  if (s.statistics) {
    const [ps, cs] = await Promise.all([
      fetchAll("player_stats", "season_id", seasons),
      fetchAll("competition_stats", "season_id", seasons),
    ]);
    out.statistics = [...ps, ...cs];
  }
  if (s.rankings || s.scores) {
    // Rankings/scores são calculados no cliente — exportamos os inputs (continental/international)
    const [cont, intl] = await Promise.all([
      fetchAll("continental_results", "season_id", seasons),
      fetchAll("international_results", "season_id", seasons),
    ]);
    if (s.rankings) out.rankings = [...cont, ...intl];
    if (s.scores) out.scores = [...cont, ...intl];
  }
  if (s.hallOfFame)
    out.hallOfFame = (readLocal<unknown[]>("fm-hall-of-fame-v1") ?? []) as unknown[];
  if (s.history) out.history = await fetchAll("club_reputation_season", "season_id", seasons);

  // Counts para metadata
  out.metadata.counts = {
    seasons: seasons === "all" ? -1 : seasons.length,
    imports: out.imports?.length ?? 0,
    players: out.entities?.players?.length ?? 0,
    clubs: out.entities?.clubs?.length ?? 0,
    coaches: out.entities?.coaches?.length ?? 0,
    countries: out.entities?.countries?.length ?? 0,
    competitions: out.entities?.competitions?.length ?? 0,
    standings: out.standings?.length ?? 0,
    statistics: out.statistics?.length ?? 0,
    rankings: out.rankings?.length ?? 0,
    scores: out.scores?.length ?? 0,
    snapshots: out.snapshots?.length ?? 0,
  };

  return out;
}

async function gzipBlob(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

export async function downloadGlobalExport(sel: ExportSelection): Promise<void> {
  const payload = await buildGlobalExport(sel);
  const text = JSON.stringify(payload, null, sel.compress ? 0 : 2);
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = sel.compress ? await gzipBlob(text) : new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sel.compress ? `fm-backup-${stamp}.json.gz` : `fm-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAvailableSeasons(): Promise<
  { id: string; year: number; label: string | null }[]
> {
  try {
    const { data, error } = await supabase
      .from("seasons")
      .select("id,year,label")
      .order("year", { ascending: false });
    if (error) return [];
    return (data ?? []) as { id: string; year: number; label: string | null }[];
  } catch {
    return [];
  }
}
