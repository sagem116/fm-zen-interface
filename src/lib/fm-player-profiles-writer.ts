// Writer do 3º ficheiro por época — Perfil dos Jogadores.
// Idempotente por época: reimportar substitui o snapshot dessa época sem
// tocar em nenhum outro dado. Não altera Rankings, Scores, Perfis, etc.

import { supabase } from "@/integrations/supabase/client";
import type { ParsedPlayerProfilesFile } from "./fm-player-profiles-parser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

async function ensureSeasonId(year: number): Promise<string> {
  const found = await sb().from("seasons").select("id").eq("year", year).maybeSingle();
  if (found.error) throw new Error(`seasons: ${found.error.message}`);
  if (found.data?.id) return found.data.id as string;
  const ins = await sb()
    .from("seasons")
    .insert({ year, label: String(year) })
    .select("id")
    .single();
  if (ins.error) throw new Error(`seasons: ${ins.error.message}`);
  return ins.data.id as string;
}

async function chunkInsert(table: string, rows: Record<string, unknown>[], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const { error } = await sb().from(table).insert(slice);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export interface PlayerProfilesImportResult {
  inserted: number;
  attributes: number;
  metrics: number;
  unknownColumns: number;
  missingAttributes: number;
}

export interface PlayerProfilesImportOptions {
  module?: "players" | "player_profiles";
  filename?: string;
}

export async function importPlayerProfilesFile(
  year: number,
  parsed: ParsedPlayerProfilesFile,
  options: PlayerProfilesImportOptions = {},
): Promise<PlayerProfilesImportResult> {
  const moduleName = options.module ?? "players";
  const seasonId = await ensureSeasonId(year);

  // Snapshot completo por época: apagar sempre a fatia desta época.
  {
    const { error } = await sb().from("player_profiles").delete().eq("season_id", seasonId);
    if (error) throw new Error(`player_profiles delete: ${error.message}`);
  }
  await sb().from("imports").delete().eq("season_id", seasonId).eq("module", moduleName);

  const rows = parsed.players.map((p) => ({
    season_id: seasonId,
    season_year: year,
    idu: p.idu,
    player_name: p.player_name,
    club: p.club,
    country: p.country,
    nationality: p.nationality,
    age: p.age,
    ca: p.ca,
    cp: p.cp,
    vp: p.vp,
    salary: p.salary,
    height: p.height,
    weight: p.weight,
    preferred_foot: p.preferred_foot,
    personality: p.personality,
    reputation: p.reputation,
    primary_position: p.primary_position,
    secondary_positions: p.secondary_positions,
    attributes: p.attributes,
    // Métricas avançadas viajam dentro de `extras` para manter o schema
    // atual da tabela `player_profiles` intacto. A separação continua
    // clara pelo prefixo do id canónico (`attribute.*` vs `metric.*`).
    extras: {
      ...p.extras,
      metrics: p.metrics,
    },
  }));
  if (rows.length) await chunkInsert("player_profiles", rows);

  const attributeCount = rows.reduce(
    (s, r) => s + Object.keys(r.attributes as Record<string, number>).length,
    0,
  );
  const metricCount = parsed.players.reduce((s, p) => s + Object.keys(p.metrics).length, 0);

  await sb()
    .from("imports")
    .insert({
      season_id: seasonId,
      module: moduleName,
      filename: options.filename ?? null,
      status: parsed.warnings.length ? "warning" : "ok",
      warnings: {
        messages: [...parsed.warnings],
        records: rows.length,
      },
    });

  return {
    inserted: rows.length,
    attributes: attributeCount,
    metrics: metricCount,
    unknownColumns: parsed.unknownColumns.length,
    missingAttributes: parsed.missingAttributes.length,
  };
}
