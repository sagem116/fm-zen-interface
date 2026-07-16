// Transfers module — parsing, normalization and persistence.
// Additive: reuses seasons/players/coaches/clubs tables via name resolution.

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

type TransferInsert = TablesInsert<"transfers">;

// ---------- Types ----------

export interface TransferRow {
  id: string;
  season_id: string;
  season_year: number;
  transfer_date: string; // ISO date (YYYY-MM-DD)
  person_type: "player" | "coach";
  person_name: string;
  person_name_key: string;
  player_id: string | null;
  coach_id: string | null;
  from_club_name: string | null;
  from_club_name_key: string | null;
  from_club_id: string | null;
  to_club_name: string | null;
  to_club_name_key: string | null;
  to_club_id: string | null;
  value: number;
  created_at: string;
}

export interface ParsedTransferInput {
  rowNumber: number;
  transferDate: string; // YYYY-MM-DD
  personName: string;
  fromClub: string | null;
  toClub: string | null;
  value: number;
}

export interface ParsedTransfersFile {
  rows: ParsedTransferInput[];
  warnings: string[];
  fatal: string[];
}

export interface TransferImportResult {
  inserted: number;
  duplicates: number;
  skipped: number;
  totalRows: number;
}

// ---------- Normalization ----------

export function normalizeKey(input: unknown): string {
  if (input == null) return "";
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseNumericPart(text: string, allowDecimal: boolean): number {
  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  let normalized = text;
  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = text.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = text.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = text.split(",");
    const last = parts[parts.length - 1] ?? "";
    // Treat as thousands separator when: no decimals allowed (whole-number context like "500,000"),
    // more than one separator ("1,500,000"), or the tail group is exactly 3 digits.
    if (!allowDecimal || parts.length > 2 || (parts.length === 2 && last.length === 3)) {
      normalized = text.replace(/,/g, "");
    } else {
      normalized = text.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = text.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (!allowDecimal || parts.length > 2 || (parts.length === 2 && last.length === 3)) {
      normalized = text.replace(/\./g, "");
    }
    // otherwise keep the decimal dot (e.g. "2.5")
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// Parses transfer values as exported by Football Manager, in Portuguese and English,
// including thousand separators, mixed suffixes ("500 mil", "€2.5M", "1.500.000"),
// full-word suffixes ("15 Million"), and free/loan/undisclosed markers.
// Returns 0 for anything that isn't a positive monetary amount.
export function parseValue(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let text = String(raw).trim();
  if (!text) return 0;

  // Explicit "no monetary value" markers — must be checked BEFORE stripping
  // currency symbols so "€ -" / "N/A" also match.
  const marker = text.toLowerCase().replace(/[.]/g, "").trim();
  if (
    /^(livre|free|gratis|grátis|n\/?a|nd|nada|desconhecido|unknown|undisclosed|nao divulgado|não divulgado|confidencial|loan|emprestimo|empréstimo|--|-|—|–)$/.test(
      marker,
    )
  ) {
    return 0;
  }

  // Strip currency symbols and non-breaking spaces; keep separators intact.
  text = text.replace(/[€$£¥\u00A0]/g, "").trim();
  if (!text) return 0;

  // Range like "€500K - €1M" or "500 mil – 1 milhão" → midpoint.
  const rangeMatch = text.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (rangeMatch && !/^\s*-\s*\d/.test(text)) {
    const a = parseValue(rangeMatch[1]);
    const b = parseValue(rangeMatch[2]);
    if (a > 0 && b > 0) return Math.round((a + b) / 2);
    if (b > 0) return b;
    if (a > 0) return a;
  }

  // Recognized suffixes (short + full words). Order longest-first so
  // "million" is preferred over the substring "m".
  const SUFFIX_RE =
    /(thousand|thousands|million|millions|billion|billions|milhoes|milhões|milhao|milhão|bilhoes|bilhões|bilioes|biliões|mil|mm|mn|bn|bi|bili|k|m|b)/i;
  const fullPattern = new RegExp(
    `^(-?[\\d.,\\s]+?)\\s*(${SUFFIX_RE.source})?\\.?$`,
    "i",
  );

  const m = text.match(fullPattern);
  if (!m) {
    const stripped = text.replace(/[^\d.,-]/g, "");
    if (!stripped) return 0;
    return parseNumericPart(stripped, false);
  }

  const numPart = m[1].replace(/\s/g, "");
  const suffix = (m[2] ?? "").toLowerCase();
  let multiplier = 1;
  if (suffix) {
    if (/^(k|mil|thousand|thousands)$/.test(suffix)) multiplier = 1_000;
    else if (
      /^(m|mm|mn|million|millions|milhao|milhão|milhoes|milhões)$/.test(suffix)
    )
      multiplier = 1_000_000;
    else if (
      /^(b|bn|bi|bili|billion|billions|bilioes|biliões|bilhoes|bilhões)$/.test(
        suffix,
      )
    )
      multiplier = 1_000_000_000;
  }
  const value = parseNumericPart(numPart, multiplier > 1);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * multiplier);
}

function parseDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  // Excel serial number
  if (typeof raw === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = raw * 24 * 60 * 60 * 1000;
    const d = new Date(epoch.getTime() + ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const text = String(raw).trim();
  if (!text) return null;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    let yyyy = Number(dmy[3]);
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  // ISO already
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(text);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// ---------- Parser ----------

const HEADER_ALIASES: Record<string, string> = {
  data: "date",
  date: "date",
  dia: "date",
  pessoa: "person",
  person: "person",
  jogador: "person",
  nome: "person",
  treinador: "person",
  coach: "person",
  de: "from",
  from: "from",
  origem: "from",
  club_de: "from",
  para: "to",
  to: "to",
  destino: "to",
  club_para: "to",
  valor: "value",
  value: "value",
  preco: "value",
  price: "value",
  transfer: "value",
};

export function parseTransfersFile(buffer: ArrayBuffer): ParsedTransfersFile {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const rows: ParsedTransferInput[] = [];
  const warnings: string[] = [];
  const fatal: string[] = [];

  const sheetName = wb.SheetNames.find((n) => {
    const k = normalizeKey(n);
    return k.includes("transf") || k.includes("mercado") || k.includes("market");
  }) ?? wb.SheetNames[0];

  if (!sheetName) {
    fatal.push("Ficheiro sem folhas.");
    return { rows, warnings, fatal };
  }

  const sheet = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });
  if (grid.length < 2) {
    fatal.push("Folha vazia.");
    return { rows, warnings, fatal };
  }

  const headerRow = grid[0].map((h) => normalizeKey(h));
  const colOf: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const canonical = HEADER_ALIASES[h] ?? h;
    if (canonical === "date" || canonical === "person" || canonical === "from" || canonical === "to" || canonical === "value") {
      if (colOf[canonical] === undefined) colOf[canonical] = i;
    }
  });

  const required = ["date", "person", "from", "to", "value"] as const;
  const missing = required.filter((r) => colOf[r] === undefined);
  if (missing.length) {
    fatal.push(
      `Colunas obrigatórias em falta: ${missing.join(", ")}. Cabeçalhos esperados: Data, Pessoa, De, Para, Valor.`,
    );
    return { rows, warnings, fatal };
  }

  for (let i = 1; i < grid.length; i++) {
    const raw = grid[i];
    if (!raw) continue;
    const personRaw = raw[colOf.person];
    const dateRaw = raw[colOf.date];
    if (!personRaw && !dateRaw) continue;
    const person = String(personRaw ?? "").trim();
    if (!person) {
      warnings.push(`Linha ${i + 1}: pessoa em branco, ignorada.`);
      continue;
    }
    const date = parseDate(dateRaw);
    if (!date) {
      warnings.push(`Linha ${i + 1}: data inválida ("${dateRaw}"), ignorada.`);
      continue;
    }
    const from = raw[colOf.from] != null ? String(raw[colOf.from]).trim() : "";
    const to = raw[colOf.to] != null ? String(raw[colOf.to]).trim() : "";
    const value = parseValue(raw[colOf.value]);
    rows.push({
      rowNumber: i + 1,
      transferDate: date,
      personName: person,
      fromClub: from || null,
      toClub: to || null,
      value,
    });
  }

  return { rows, warnings, fatal };
}

// ---------- Import ----------

async function ensureSeasonId(year: number): Promise<string> {
  const { data: existing } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", year)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("seasons")
    .insert({ year, label: String(year) })
    .select("id")
    .single();
  if (error) throw new Error(`seasons.insert: ${error.message}`);
  return data.id;
}

interface Lookups {
  playersByKey: Map<string, string>;
  coachesByKey: Map<string, string>;
  clubsByKey: Map<string, string>;
}

async function buildLookups(seasonId: string): Promise<Lookups> {
  const [{ data: players }, { data: coaches }, { data: clubs }] = await Promise.all([
    supabase.from("players").select("id,name").eq("season_id", seasonId),
    supabase.from("coaches").select("id,name"),
    supabase.from("clubs").select("id,name"),
  ]);
  const playersByKey = new Map<string, string>();
  for (const p of players ?? []) {
    if (p.name) playersByKey.set(normalizeKey(p.name), p.id);
  }
  const coachesByKey = new Map<string, string>();
  for (const c of coaches ?? []) {
    if (c.name) coachesByKey.set(normalizeKey(c.name), c.id);
  }
  const clubsByKey = new Map<string, string>();
  for (const c of clubs ?? []) {
    if (c.name) clubsByKey.set(normalizeKey(c.name), c.id);
  }
  return { playersByKey, coachesByKey, clubsByKey };
}

export interface ImportTransfersProgress {
  phase: "seasons" | "lookups" | "dedup" | "insert" | "log";
  processed: number;
  total: number;
  ratio: number; // 0..1
}

export async function importTransfersFile(
  year: number,
  parsed: ParsedTransfersFile,
  opts: { filename: string; onProgress?: (p: ImportTransfersProgress) => void },
): Promise<TransferImportResult> {
  const report = (
    phase: ImportTransfersProgress["phase"],
    processed: number,
    total: number,
  ) => {
    if (!opts.onProgress) return;
    const ratio = total > 0 ? Math.max(0, Math.min(1, processed / total)) : 0;
    opts.onProgress({ phase, processed, total, ratio });
  };

  report("seasons", 0, 1);
  const seasonId = await ensureSeasonId(year);
  report("lookups", 0, 1);
  const lookups = await buildLookups(seasonId);

  // Fetch existing dedup keys for this season to skip duplicates.
  report("dedup", 0, parsed.rows.length);
  const { data: existingRows } = await supabase
    .from("transfers")
    .select("transfer_date,person_name_key,from_club_name_key,to_club_name_key,value")
    .eq("season_id", seasonId);
  const existingKeys = new Set<string>();
  for (const r of existingRows ?? []) {
    existingKeys.add(
      [
        r.transfer_date,
        r.person_name_key,
        r.from_club_name_key ?? "",
        r.to_club_name_key ?? "",
        String(r.value ?? 0),
      ].join("|"),
    );
  }

  const payload: TransferInsert[] = [];
  let duplicates = 0;
  let skipped = 0;

  for (let idx = 0; idx < parsed.rows.length; idx++) {
    const row = parsed.rows[idx];
    const personKey = normalizeKey(row.personName);
    const fromKey = row.fromClub ? normalizeKey(row.fromClub) : "";
    const toKey = row.toClub ? normalizeKey(row.toClub) : "";
    const dedupKey = [row.transferDate, personKey, fromKey, toKey, String(row.value)].join("|");
    if (existingKeys.has(dedupKey)) {
      duplicates++;
      continue;
    }
    existingKeys.add(dedupKey);

    const playerId = lookups.playersByKey.get(personKey) ?? null;
    const coachId = playerId ? null : lookups.coachesByKey.get(personKey) ?? null;
    const personType: "player" | "coach" = coachId && !playerId ? "coach" : "player";

    payload.push({
      season_id: seasonId,
      season_year: year,
      transfer_date: row.transferDate,
      person_type: personType,
      person_name: row.personName,
      person_name_key: personKey,
      player_id: playerId,
      coach_id: coachId,
      from_club_name: row.fromClub,
      from_club_name_key: fromKey || null,
      from_club_id: fromKey ? lookups.clubsByKey.get(fromKey) ?? null : null,
      to_club_name: row.toClub,
      to_club_name_key: toKey || null,
      to_club_id: toKey ? lookups.clubsByKey.get(toKey) ?? null : null,
      value: row.value,
    });
    if ((idx & 511) === 0) report("dedup", idx + 1, parsed.rows.length);
  }
  report("dedup", parsed.rows.length, parsed.rows.length);

  let inserted = 0;
  if (payload.length > 0) {
    const chunkSize = 500;
    report("insert", 0, payload.length);
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await supabase.from("transfers").insert(chunk);
      if (error) {
        // Fall back to per-row insertion to isolate duplicates or bad rows.
        for (const row of chunk) {
          const { error: rowErr } = await supabase.from("transfers").insert(row);
          if (rowErr) {
            if (rowErr.code === "23505") duplicates++;
            else skipped++;
          } else {
            inserted++;
          }
        }
      } else {
        inserted += chunk.length;
      }
      report("insert", Math.min(i + chunkSize, payload.length), payload.length);
    }
  }

  report("log", 0, 1);
  await supabase.from("imports").insert({
    season_id: seasonId,
    module: "transfers",
    filename: opts.filename,
    status: parsed.fatal.length ? "error" : parsed.warnings.length ? "warning" : "ok",
    warnings: {
      messages: [...parsed.fatal, ...parsed.warnings],
      records: inserted,
      duplicates,
      skipped,
      totalRows: parsed.rows.length,
    },
  });
  report("log", 1, 1);



  return { inserted, duplicates, skipped, totalRows: parsed.rows.length };
}

// ---------- Fetchers for profile tabs ----------

export interface TransferListRow {
  id: string;
  season_year: number;
  transfer_date: string;
  person_type: "player" | "coach";
  person_name: string;
  from_club_name: string | null;
  to_club_name: string | null;
  value: number;
}

export async function fetchTransfersByClub(clubName: string): Promise<TransferListRow[]> {
  const key = normalizeKey(clubName);
  if (!key) return [];
  const { data, error } = await supabase
    .from("transfers")
    .select(
      "id,season_year,transfer_date,person_type,person_name,from_club_name,to_club_name,value,from_club_name_key,to_club_name_key",
    )
    .or(`from_club_name_key.eq.${key},to_club_name_key.eq.${key}`)
    .order("transfer_date", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`transfers.byClub: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    season_year: r.season_year,
    transfer_date: r.transfer_date,
    person_type: r.person_type as "player" | "coach",
    person_name: r.person_name,
    from_club_name: r.from_club_name,
    to_club_name: r.to_club_name,
    value: Number(r.value),
  }));
}

export async function fetchTransfersByPerson(
  personName: string,
  kind: "player" | "coach",
): Promise<TransferListRow[]> {
  const key = normalizeKey(personName);
  if (!key) return [];
  const { data, error } = await supabase
    .from("transfers")
    .select(
      "id,season_year,transfer_date,person_type,person_name,from_club_name,to_club_name,value",
    )
    .eq("person_name_key", key)
    .eq("person_type", kind)
    .order("transfer_date", { ascending: false })
    .limit(500);
  if (error) throw new Error(`transfers.byPerson: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    season_year: r.season_year,
    transfer_date: r.transfer_date,
    person_type: r.person_type as "player" | "coach",
    person_name: r.person_name,
    from_club_name: r.from_club_name,
    to_club_name: r.to_club_name,
    value: Number(r.value),
  }));
}
