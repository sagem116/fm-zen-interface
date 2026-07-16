// Competition Market — Fase A computations.
// Sections implemented: 2 (Fluxo Global), 3 (Origem), 4 (Destino), 12 (Clubes ativos).
import type { CompetitionMarketData, RawTransfer } from "./data";
import { normKey, seasonClubKey } from "./data";

export interface FlowMetric {
  buys: number;
  sales: number;
  playerBalance: number; // buys - sales
  spent: number;
  received: number;
  financialBalance: number;
  avgBuyValue: number;
  avgSaleValue: number;
  biggestBuy: RawTransfer | null;
  biggestSale: RawTransfer | null;
}
export interface YearlyFlow extends FlowMetric {
  season_year: number;
}

export interface CompetitionMarketFlow {
  total: FlowMetric;
  byYear: YearlyFlow[];
  biggestWindow: { season_year: number; movements: number } | null;
}

function isBuy(t: RawTransfer, memberKeys: Set<string>): boolean {
  return memberKeys.has(seasonClubKey(t.to_club_name, t.season_year));
}
function isSale(t: RawTransfer, memberKeys: Set<string>): boolean {
  return memberKeys.has(seasonClubKey(t.from_club_name, t.season_year));
}

function summarize(rows: { buys: RawTransfer[]; sales: RawTransfer[] }): FlowMetric {
  const buyVals = rows.buys.map((t) => Number(t.value) || 0);
  const saleVals = rows.sales.map((t) => Number(t.value) || 0);
  const spent = buyVals.reduce((s, v) => s + v, 0);
  const received = saleVals.reduce((s, v) => s + v, 0);
  const biggestBuy = rows.buys.reduce<RawTransfer | null>(
    (best, t) => (!best || (Number(t.value) || 0) > (Number(best.value) || 0) ? t : best),
    null,
  );
  const biggestSale = rows.sales.reduce<RawTransfer | null>(
    (best, t) => (!best || (Number(t.value) || 0) > (Number(best.value) || 0) ? t : best),
    null,
  );
  return {
    buys: rows.buys.length,
    sales: rows.sales.length,
    playerBalance: rows.buys.length - rows.sales.length,
    spent,
    received,
    financialBalance: received - spent,
    avgBuyValue: rows.buys.length ? spent / rows.buys.length : 0,
    avgSaleValue: rows.sales.length ? received / rows.sales.length : 0,
    biggestBuy,
    biggestSale,
  };
}

export function computeFlow(m: CompetitionMarketData): CompetitionMarketFlow {
  const buys = m.transfers.filter((t) => isBuy(t, m.memberKeys));
  const sales = m.transfers.filter((t) => isSale(t, m.memberKeys));
  const total = summarize({ buys, sales });

  // Per year
  const byYearMap = new Map<number, { buys: RawTransfer[]; sales: RawTransfer[] }>();
  for (const t of buys) {
    if (!t.season_year) continue;
    const arr = byYearMap.get(t.season_year) ?? { buys: [], sales: [] };
    arr.buys.push(t);
    byYearMap.set(t.season_year, arr);
  }
  for (const t of sales) {
    if (!t.season_year) continue;
    const arr = byYearMap.get(t.season_year) ?? { buys: [], sales: [] };
    arr.sales.push(t);
    byYearMap.set(t.season_year, arr);
  }
  const byYear: YearlyFlow[] = [...byYearMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, r]) => ({ season_year: year, ...summarize(r) }));

  const biggestWindow = byYear.length
    ? byYear
        .map((y) => ({ season_year: y.season_year, movements: y.buys + y.sales }))
        .reduce((best, cur) => (cur.movements > best.movements ? cur : best))
    : null;

  return { total, byYear, biggestWindow };
}

// ---------- Origin / Destination ----------
export interface DimensionRow {
  key: string;
  label: string;
  count: number;
  pct: number;
  value: number; // total value
  avgValue: number;
}
export interface DimensionBreakdown {
  byCountry: DimensionRow[];
  byCompetition: DimensionRow[];
  byDivision: DimensionRow[];
  byClub: DimensionRow[];
}

function attribute(
  t: RawTransfer,
  side: "from" | "to",
  catalog: CompetitionMarketData["clubCatalog"],
): { country: string; competition: string; division: string; club: string } {
  const club = side === "from" ? t.from_club_name : t.to_club_name;
  const key = seasonClubKey(club, t.season_year);
  const meta = catalog.get(key);
  // Defensive: never surface numeric IDs as country names.
  const rawCountry = meta?.country ?? null;
  const country =
    rawCountry && !/^\s*-?\d+\s*$/.test(rawCountry) && rawCountry.trim() !== "-"
      ? rawCountry
      : "País desconhecido";
  return {
    club: club ?? "Clube desconhecido",
    country,
    competition: meta?.competition ?? "Competição desconhecida",
    division: meta?.division_num != null ? `Div. ${meta.division_num}` : "—",
  };
}

function rankByDimension<T>(
  items: T[],
  keyFn: (t: T) => string,
  valueFn: (t: T) => number,
  labelFn?: (k: string) => string,
): DimensionRow[] {
  const totals = new Map<string, { count: number; value: number }>();
  for (const it of items) {
    const k = keyFn(it);
    if (!k || k === "—") continue;
    const prev = totals.get(k) ?? { count: 0, value: 0 };
    prev.count += 1;
    prev.value += valueFn(it);
    totals.set(k, prev);
  }
  const totalCount = items.length || 1;
  return [...totals.entries()]
    .map(([k, v]) => ({
      key: k,
      label: labelFn ? labelFn(k) : k,
      count: v.count,
      pct: (v.count / totalCount) * 100,
      value: v.value,
      avgValue: v.count ? v.value / v.count : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeOriginDestination(m: CompetitionMarketData): {
  origin: DimensionBreakdown;
  destination: DimensionBreakdown;
} {
  const buys = m.transfers.filter((t) => m.memberKeys.has(seasonClubKey(t.to_club_name, t.season_year)));
  const sales = m.transfers.filter((t) => m.memberKeys.has(seasonClubKey(t.from_club_name, t.season_year)));

  // For origin: FROM side of a buy = de onde chega o jogador
  const originAttrs = buys.map((t) => ({ ...attribute(t, "from", m.clubCatalog), value: Number(t.value) || 0 }));
  const destinationAttrs = sales.map((t) => ({ ...attribute(t, "to", m.clubCatalog), value: Number(t.value) || 0 }));

  const origin: DimensionBreakdown = {
    byCountry: rankByDimension(originAttrs, (a) => a.country, (a) => a.value),
    byCompetition: rankByDimension(originAttrs, (a) => a.competition, (a) => a.value),
    byDivision: rankByDimension(originAttrs, (a) => a.division, (a) => a.value),
    byClub: rankByDimension(originAttrs, (a) => a.club, (a) => a.value),
  };
  const destination: DimensionBreakdown = {
    byCountry: rankByDimension(destinationAttrs, (a) => a.country, (a) => a.value),
    byCompetition: rankByDimension(destinationAttrs, (a) => a.competition, (a) => a.value),
    byDivision: rankByDimension(destinationAttrs, (a) => a.division, (a) => a.value),
    byClub: rankByDimension(destinationAttrs, (a) => a.club, (a) => a.value),
  };
  return { origin, destination };
}

// ---------- Most active clubs ----------
export interface ClubActivity {
  club: string;
  buys: number;
  sales: number;
  spent: number;
  received: number;
  balance: number; // received - spent
  movements: number;
}
export function computeActiveClubs(m: CompetitionMarketData): ClubActivity[] {
  const map = new Map<string, ClubActivity>();
  const bump = (club: string | null, delta: Partial<ClubActivity>) => {
    if (!club) return;
    const key = normKey(club);
    if (!m.memberClubsAllTime.has(key)) return; // only member clubs
    const prev = map.get(club) ?? {
      club,
      buys: 0,
      sales: 0,
      spent: 0,
      received: 0,
      balance: 0,
      movements: 0,
    };
    map.set(club, {
      ...prev,
      buys: prev.buys + (delta.buys ?? 0),
      sales: prev.sales + (delta.sales ?? 0),
      spent: prev.spent + (delta.spent ?? 0),
      received: prev.received + (delta.received ?? 0),
      movements: prev.movements + (delta.movements ?? 0),
      balance: prev.received + (delta.received ?? 0) - (prev.spent + (delta.spent ?? 0)),
    });
  };
  for (const t of m.transfers) {
    const val = Number(t.value) || 0;
    if (m.memberKeys.has(seasonClubKey(t.to_club_name, t.season_year))) {
      bump(t.to_club_name, { buys: 1, spent: val, movements: 1 });
    }
    if (m.memberKeys.has(seasonClubKey(t.from_club_name, t.season_year))) {
      bump(t.from_club_name, { sales: 1, received: val, movements: 1 });
    }
  }
  return [...map.values()];
}
