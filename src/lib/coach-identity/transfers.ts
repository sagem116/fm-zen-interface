// Coach transfers intelligence — Module 3 of Coach Identity.
// Fetches player transfers involving the coach's assigned clubs during their seasons
// and computes preferences + efficiency using existing player_profiles snapshots.
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { CoachAssignmentLite, PlayerProfileRow } from "./data";
import { parsePrimaryPosition } from "./positions";

export interface TransferRow {
  season_year: number | null;
  person_name: string;
  from_club_name: string | null;
  to_club_name: string | null;
  value: number | null;
}

export interface CoachTransferData {
  arrivals: TransferRow[];
  departures: TransferRow[];
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

export async function fetchCoachTransfers(
  coachName: string,
  assignments: CoachAssignmentLite[],
): Promise<CoachTransferData> {
  if (!assignments.length) return { arrivals: [], departures: [] };
  const clubs = [...new Set(assignments.map((a) => a.club_name).filter((x): x is string => !!x))];
  const years = [...new Set(assignments.map((a) => a.season_year).filter((y): y is number => !!y))];
  if (!clubs.length || !years.length) return { arrivals: [], departures: [] };

  const { data } = (await supabase
    .from("transfers")
    .select("season_year, person_name, from_club_name, to_club_name, value, person_type")
    .eq("person_type", "player")
    .in("season_year", years)) as unknown as {
    data: Array<TransferRow & { person_type: string }> | null;
  };

  const clubSet = new Set(clubs.map(norm));
  const assignKey = new Set(
    assignments.map((a) => `${norm(a.club_name)}::${a.season_year}`),
  );
  const arrivals: TransferRow[] = [];
  const departures: TransferRow[] = [];
  for (const t of data ?? []) {
    if (!t.season_year) continue;
    const toK = `${norm(t.to_club_name)}::${t.season_year}`;
    const fromK = `${norm(t.from_club_name)}::${t.season_year}`;
    if (clubSet.has(norm(t.to_club_name)) && assignKey.has(toK)) arrivals.push(t);
    if (clubSet.has(norm(t.from_club_name)) && assignKey.has(fromK)) departures.push(t);
  }
  void coachName;
  return { arrivals, departures };
}

export function useCoachTransfers(coachName: string, assignments: CoachAssignmentLite[] | undefined) {
  return useQuery({
    queryKey: ["coach-transfers", coachName, assignments?.length ?? 0],
    queryFn: () => fetchCoachTransfers(coachName, assignments ?? []),
    staleTime: 5 * 60 * 1000,
    enabled: !!coachName && !!assignments && assignments.length > 0,
  });
}

// ---------- Computation ----------

export interface TransferPreferences {
  count: number;
  avgAge: number;
  avgCa: number;
  avgCp: number;
  avgHeight: number;
  avgWeight: number;
  avgValue: number;
  totalValue: number;
  freeAgents: number;
  positions: Array<{ label: string; count: number; pct: number }>;
  feet: { right: number; left: number; ambi: number };
}

export interface TransferEfficiencyEntry {
  name: string;
  arrivalYear: number;
  arrivalCa: number;
  latestCa: number;
  caGain: number;
  arrivalValue: number;
  latestValue: number | null;
}

export interface CoachTransferMetrics {
  totalArrivals: number;
  totalDepartures: number;
  spent: number;
  received: number;
  netBalance: number;
  arrivals: TransferPreferences;
  departures: TransferPreferences;
  efficiency: {
    avgCaGain: number;
    successRate: number; // % where CA increased
    top: TransferEfficiencyEntry[];
    poor: TransferEfficiencyEntry[];
  };
}

function playerKeyFromName(name: string): string {
  return name.toLowerCase().trim();
}

function computePreferences(
  transfers: TransferRow[],
  playersBySeasonName: Map<string, PlayerProfileRow>,
): TransferPreferences {
  const totalValue = transfers.reduce((s, t) => s + (Number(t.value) || 0), 0);
  const freeAgents = transfers.filter((t) => !t.value || Number(t.value) === 0).length;

  const ages: number[] = [];
  const cas: number[] = [];
  const cps: number[] = [];
  const heights: number[] = [];
  const weights: number[] = [];
  const values: number[] = [];
  const posCounts = new Map<string, number>();
  let right = 0, left = 0, ambi = 0, footTotal = 0;

  for (const t of transfers) {
    if (t.value) values.push(Number(t.value));
    const k = `${playerKeyFromName(t.person_name)}::${t.season_year}`;
    const snap = playersBySeasonName.get(k);
    if (!snap) continue;
    if (snap.age) ages.push(snap.age);
    if (snap.ca) cas.push(snap.ca);
    if (snap.cp) cps.push(snap.cp);
    if (snap.height) heights.push(Number(snap.height));
    if (snap.weight) weights.push(Number(snap.weight));
    const pos = parsePrimaryPosition(snap.primary_position);
    posCounts.set(pos.group, (posCounts.get(pos.group) ?? 0) + 1);
    const f = (snap.preferred_foot ?? "").toLowerCase();
    footTotal++;
    if (f.includes("ambi") || f.includes("both") || f.includes("dois")) ambi++;
    else if (f.includes("esq") || f.includes("left") || f === "l") left++;
    else right++;
  }
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const total = transfers.length;
  const posLabel: Record<string, string> = {
    GK: "Guarda-redes",
    DEF: "Defesas",
    MID: "Médios",
    ATT: "Avançados",
  };
  const positions = [...posCounts.entries()]
    .map(([k, count]) => ({
      label: posLabel[k] ?? k,
      count,
      pct: total ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
  return {
    count: total,
    avgAge: mean(ages),
    avgCa: mean(cas),
    avgCp: mean(cps),
    avgHeight: mean(heights),
    avgWeight: mean(weights),
    avgValue: mean(values),
    totalValue,
    freeAgents,
    positions,
    feet: {
      right: footTotal ? (right / footTotal) * 100 : 0,
      left: footTotal ? (left / footTotal) * 100 : 0,
      ambi: footTotal ? (ambi / footTotal) * 100 : 0,
    },
  };
}

export function computeTransferMetrics(
  transfers: CoachTransferData,
  players: PlayerProfileRow[],
): CoachTransferMetrics {
  // Index player_profiles by (name, season) for join and by name for "latest CA"
  const bySeasonName = new Map<string, PlayerProfileRow>();
  const latestByName = new Map<string, PlayerProfileRow>();
  for (const p of players) {
    const nameKey = playerKeyFromName(p.player_name);
    bySeasonName.set(`${nameKey}::${p.season_year}`, p);
    const prev = latestByName.get(nameKey);
    if (!prev || (p.season_year ?? 0) > (prev.season_year ?? 0)) {
      latestByName.set(nameKey, p);
    }
  }

  const spent = transfers.arrivals.reduce((s, t) => s + (Number(t.value) || 0), 0);
  const received = transfers.departures.reduce((s, t) => s + (Number(t.value) || 0), 0);
  const arrivals = computePreferences(transfers.arrivals, bySeasonName);
  const departures = computePreferences(transfers.departures, bySeasonName);

  // Efficiency: arrivals with a "landing" snapshot vs latest under coach
  const efficiency: TransferEfficiencyEntry[] = [];
  for (const t of transfers.arrivals) {
    const nameKey = playerKeyFromName(t.person_name);
    const arrivalSnap = bySeasonName.get(`${nameKey}::${t.season_year}`);
    const latest = latestByName.get(nameKey);
    if (!arrivalSnap || !latest) continue;
    const arrivalCa = arrivalSnap.ca ?? 0;
    const latestCa = latest.ca ?? 0;
    if (!arrivalCa || !latestCa) continue;
    efficiency.push({
      name: t.person_name,
      arrivalYear: t.season_year ?? 0,
      arrivalCa,
      latestCa,
      caGain: latestCa - arrivalCa,
      arrivalValue: Number(t.value) || 0,
      latestValue: latest.vp != null ? Number(latest.vp) : null,
    });
  }
  const avgCaGain = efficiency.length
    ? efficiency.reduce((s, e) => s + e.caGain, 0) / efficiency.length
    : 0;
  const successRate = efficiency.length
    ? (efficiency.filter((e) => e.caGain > 0).length / efficiency.length) * 100
    : 0;
  const top = [...efficiency].sort((a, b) => b.caGain - a.caGain).slice(0, 8);
  const poor = [...efficiency].sort((a, b) => a.caGain - b.caGain).slice(0, 6);

  return {
    totalArrivals: transfers.arrivals.length,
    totalDepartures: transfers.departures.length,
    spent,
    received,
    netBalance: received - spent,
    arrivals,
    departures,
    efficiency: { avgCaGain, successRate, top, poor },
  };
}
