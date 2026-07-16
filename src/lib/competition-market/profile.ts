// Competition Market — Fase B computations.
// Sections implemented:
//   5  Nacionalidades
//   6  Perfil etário
//   7  Perfil técnico (CA / VP / reputação)
//   8  Perfil posicional
//  10  Perfil (personalidade, pé preferido, altura)
//  11  Mercado interno vs externo
import type { CompetitionMarketData, PlayerSnapshot, RawTransfer } from "./data";
import { normKey, playerKey, seasonClubKey } from "./data";
import { parsePrimaryPosition, labelForGroup, type PositionGroup } from "@/lib/coach-identity/positions";

export interface Bucket {
  key: string;
  label: string;
  buys: number;
  sales: number;
  buysPct: number;
  salesPct: number;
  avgBuyValue: number;
  avgSaleValue: number;
}

export interface EnrichedTransfer {
  transfer: RawTransfer;
  snapshot: PlayerSnapshot | undefined;
  side: "buy" | "sale";
}

export function enrichTransfers(m: CompetitionMarketData): EnrichedTransfer[] {
  const out: EnrichedTransfer[] = [];
  for (const t of m.transfers) {
    const snap = m.playerIndex.get(playerKey(t.person_name, t.season_year));
    const isBuy = m.memberKeys.has(seasonClubKey(t.to_club_name, t.season_year));
    const isSale = m.memberKeys.has(seasonClubKey(t.from_club_name, t.season_year));
    if (isBuy) out.push({ transfer: t, snapshot: snap, side: "buy" });
    if (isSale) out.push({ transfer: t, snapshot: snap, side: "sale" });
  }
  return out;
}

function bucketize(
  items: EnrichedTransfer[],
  keyFn: (e: EnrichedTransfer) => { key: string; label: string } | null,
): Bucket[] {
  const map = new Map<string, { label: string; buys: RawTransfer[]; sales: RawTransfer[] }>();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    const prev = map.get(k.key) ?? { label: k.label, buys: [], sales: [] };
    if (it.side === "buy") prev.buys.push(it.transfer);
    else prev.sales.push(it.transfer);
    map.set(k.key, prev);
  }
  const totalBuys = items.filter((i) => i.side === "buy").length || 1;
  const totalSales = items.filter((i) => i.side === "sale").length || 1;
  return [...map.entries()]
    .map(([key, v]) => {
      const bv = v.buys.map((t) => Number(t.value) || 0);
      const sv = v.sales.map((t) => Number(t.value) || 0);
      return {
        key,
        label: v.label,
        buys: v.buys.length,
        sales: v.sales.length,
        buysPct: (v.buys.length / totalBuys) * 100,
        salesPct: (v.sales.length / totalSales) * 100,
        avgBuyValue: bv.length ? bv.reduce((a, b) => a + b, 0) / bv.length : 0,
        avgSaleValue: sv.length ? sv.reduce((a, b) => a + b, 0) / sv.length : 0,
      };
    })
    .sort((a, b) => b.buys + b.sales - (a.buys + a.sales));
}

// Section 5 — Nationalities
export function computeNationalities(m: CompetitionMarketData) {
  const items = enrichTransfers(m);
  const withData = items.filter((i) => i.snapshot?.nationality);
  const byNationality = bucketize(withData, (i) =>
    i.snapshot?.nationality ? { key: normKey(i.snapshot.nationality), label: i.snapshot.nationality } : null,
  );
  const byContinent = bucketize(withData, (i) =>
    i.snapshot?.continent ? { key: normKey(i.snapshot.continent), label: i.snapshot.continent } : null,
  );
  return { byNationality, byContinent, coverage: withData.length, total: items.length };
}

// Section 6 — Age profile
export interface AgeStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  under21: number;
  age21to25: number;
  age26to30: number;
  over30: number;
}
function ageStats(items: EnrichedTransfer[]): AgeStats {
  const ages = items.map((i) => i.snapshot?.age).filter((a): a is number => a != null);
  if (!ages.length)
    return { count: 0, avg: 0, min: 0, max: 0, under21: 0, age21to25: 0, age26to30: 0, over30: 0 };
  return {
    count: ages.length,
    avg: ages.reduce((a, b) => a + b, 0) / ages.length,
    min: Math.min(...ages),
    max: Math.max(...ages),
    under21: ages.filter((a) => a < 21).length,
    age21to25: ages.filter((a) => a >= 21 && a <= 25).length,
    age26to30: ages.filter((a) => a >= 26 && a <= 30).length,
    over30: ages.filter((a) => a > 30).length,
  };
}
export function computeAgeProfile(m: CompetitionMarketData) {
  const items = enrichTransfers(m);
  const buys = items.filter((i) => i.side === "buy");
  const sales = items.filter((i) => i.side === "sale");
  const buyStats = ageStats(buys);
  const saleStats = ageStats(sales);
  // Yearly trend
  const yearMap = new Map<number, { buyAges: number[]; saleAges: number[] }>();
  for (const it of items) {
    const y = it.transfer.season_year;
    if (!y || it.snapshot?.age == null) continue;
    const prev = yearMap.get(y) ?? { buyAges: [], saleAges: [] };
    (it.side === "buy" ? prev.buyAges : prev.saleAges).push(it.snapshot.age);
    yearMap.set(y, prev);
  }
  const yearly = [...yearMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, v]) => ({
      season_year: year,
      avgBuyAge: v.buyAges.length ? v.buyAges.reduce((a, b) => a + b, 0) / v.buyAges.length : 0,
      avgSaleAge: v.saleAges.length ? v.saleAges.reduce((a, b) => a + b, 0) / v.saleAges.length : 0,
    }));
  return { buyStats, saleStats, yearly };
}

// Section 7 — Technical profile (CA / VP / reputation buckets)
function bucketRange(v: number | null | undefined, edges: number[], labels: string[]): { key: string; label: string } | null {
  if (v == null) return null;
  for (let i = 0; i < edges.length; i++) {
    if (v < edges[i]) return { key: `b${i}`, label: labels[i] };
  }
  return { key: `b${edges.length}`, label: labels[edges.length] };
}
export function computeTechnicalProfile(m: CompetitionMarketData) {
  const items = enrichTransfers(m);
  const byCA = bucketize(items, (i) =>
    bucketRange(i.snapshot?.ca ?? null, [100, 130, 160], ["<100", "100–129", "130–159", "160+"]),
  );
  const byReputation = bucketize(items, (i) =>
    bucketRange(i.snapshot?.reputation ?? null, [4, 7, 9], ["1–3", "4–6", "7–8", "9–10"]),
  );
  // Averages (buys vs sales)
  const summarize = (side: "buy" | "sale") => {
    const arr = items.filter((i) => i.side === side);
    const num = (fn: (s: PlayerSnapshot) => number | null | undefined) => {
      const vals = arr.map((i) => (i.snapshot ? fn(i.snapshot) : null)).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return {
      avgCA: num((s) => s.ca),
      avgVP: num((s) => s.vp),
      avgSalary: num((s) => s.salary),
      avgReputation: num((s) => s.reputation),
    };
  };
  return { byCA, byReputation, buys: summarize("buy"), sales: summarize("sale") };
}

// Section 8 — Positional profile
export function computePositionalProfile(m: CompetitionMarketData) {
  const items = enrichTransfers(m);
  const byGroup = bucketize(items, (i) => {
    if (!i.snapshot?.primary_position) return null;
    const p = parsePrimaryPosition(i.snapshot.primary_position);
    return { key: p.group, label: labelForGroup(p.group) };
  });
  // Ensure fixed order GK/DEF/MID/ATT
  const order: PositionGroup[] = ["GK", "DEF", "MID", "ATT"];
  byGroup.sort((a, b) => order.indexOf(a.key as PositionGroup) - order.indexOf(b.key as PositionGroup));
  return { byGroup };
}

// Section 10 — Personality / preferred foot / height
export function computePersonalProfile(m: CompetitionMarketData) {
  const items = enrichTransfers(m);
  const byPersonality = bucketize(items, (i) =>
    i.snapshot?.personality ? { key: normKey(i.snapshot.personality), label: i.snapshot.personality } : null,
  );
  const byFoot = bucketize(items, (i) =>
    i.snapshot?.preferred_foot
      ? { key: normKey(i.snapshot.preferred_foot), label: i.snapshot.preferred_foot }
      : null,
  );
  // Height buckets (cm)
  const byHeight = bucketize(items, (i) =>
    bucketRange(i.snapshot?.height ?? null, [175, 185, 190], ["<175", "175–184", "185–189", "190+"]),
  );
  return { byPersonality, byFoot, byHeight };
}

// Section 11 — Internal vs External market
export interface InternalExternal {
  buys: { internal: number; external: number; internalPct: number };
  sales: { internal: number; external: number; internalPct: number };
  internalPartners: Array<{ club: string; total: number }>; // most frequent internal partners
}
export function computeInternalExternal(m: CompetitionMarketData): InternalExternal {
  let buyIn = 0,
    buyEx = 0,
    saleIn = 0,
    saleEx = 0;
  const partners = new Map<string, number>();
  for (const t of m.transfers) {
    const fromMember = m.memberKeys.has(seasonClubKey(t.from_club_name, t.season_year));
    const toMember = m.memberKeys.has(seasonClubKey(t.to_club_name, t.season_year));
    if (toMember) {
      if (fromMember) {
        buyIn++;
        if (t.from_club_name) partners.set(t.from_club_name, (partners.get(t.from_club_name) ?? 0) + 1);
      } else buyEx++;
    }
    if (fromMember) {
      if (toMember) {
        saleIn++;
        if (t.to_club_name) partners.set(t.to_club_name, (partners.get(t.to_club_name) ?? 0) + 1);
      } else saleEx++;
    }
  }
  const totalBuys = buyIn + buyEx || 1;
  const totalSales = saleIn + saleEx || 1;
  const internalPartners = [...partners.entries()]
    .map(([club, total]) => ({ club, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);
  return {
    buys: { internal: buyIn, external: buyEx, internalPct: (buyIn / totalBuys) * 100 },
    sales: { internal: saleIn, external: saleEx, internalPct: (saleIn / totalSales) * 100 },
    internalPartners,
  };
}
