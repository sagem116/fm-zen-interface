// Market Rankings — aggregations by competition / club / coach.
// Pure functions over MarketDataset + MarketFilters.

import type {
  MarketEntityKind,
  MarketFilters,
  MarketRankingResult,
  MarketRankingRow,
} from "./types";
import { normKey, type MarketDataset, type MarketTransfer } from "./service";

interface Bucket {
  key: string;
  name: string;
  buysValue: number;
  salesValue: number;
  maxValue: number;
  transferCount: number;
  ageSum: number;
  ageCount: number;
  country: string | null;
  continent: string | null;
  competition: string | null;
  valuedCount: number; // for average
  valuedSum: number;
}

const newBucket = (key: string, name: string): Bucket => ({
  key,
  name,
  buysValue: 0,
  salesValue: 0,
  maxValue: 0,
  transferCount: 0,
  ageSum: 0,
  ageCount: 0,
  country: null,
  continent: null,
  competition: null,
  valuedCount: 0,
  valuedSum: 0,
});

function matchesTransferFilters(t: MarketTransfer, f: MarketFilters): boolean {
  if (f.seasonFrom != null && t.season_year < f.seasonFrom) return false;
  if (f.seasonTo != null && t.season_year > f.seasonTo) return false;
  return true;
}

function passesGroupFilters(
  bucket: Bucket,
  f: MarketFilters,
  kind: MarketEntityKind,
): boolean {
  if (f.country && bucket.country !== f.country) return false;
  if (f.continent && bucket.continent !== f.continent) return false;
  if (f.competition && kind !== "competition" && bucket.competition !== f.competition) return false;
  if (f.competition && kind === "competition" && bucket.name !== f.competition) return false;
  return true;
}

interface Contribution {
  key: string;
  name: string;
  side: "buy" | "sell";
  transfer: MarketTransfer;
  country: string | null;
  continent: string | null;
  competition: string | null;
}

function contributionsFor(
  t: MarketTransfer,
  kind: MarketEntityKind,
  dataset: MarketDataset,
): Contribution[] {
  const out: Contribution[] = [];
  if (kind === "competition") {
    if (t.buyerCompetition) {
      out.push({
        key: normKey(t.buyerCompetition),
        name: t.buyerCompetition,
        side: "buy",
        transfer: t,
        country: t.buyerCountry,
        continent: t.buyerContinent,
        competition: t.buyerCompetition,
      });
    }
    if (t.sellerCompetition) {
      out.push({
        key: normKey(t.sellerCompetition),
        name: t.sellerCompetition,
        side: "sell",
        transfer: t,
        country: t.sellerCountry,
        continent: t.sellerContinent,
        competition: t.sellerCompetition,
      });
    }
  } else if (kind === "club") {
    if (t.to_club_key && t.to_club) {
      out.push({
        key: t.to_club_key,
        name: dataset.clubDisplayName.get(t.to_club_key) ?? t.to_club,
        side: "buy",
        transfer: t,
        country: t.buyerCountry,
        continent: t.buyerContinent,
        competition: t.buyerCompetition,
      });
    }
    if (t.from_club_key && t.from_club) {
      out.push({
        key: t.from_club_key,
        name: dataset.clubDisplayName.get(t.from_club_key) ?? t.from_club,
        side: "sell",
        transfer: t,
        country: t.sellerCountry,
        continent: t.sellerContinent,
        competition: t.sellerCompetition,
      });
    }
  } else {
    // coach
    if (t.buyerCoach) {
      out.push({
        key: normKey(t.buyerCoach),
        name: t.buyerCoach,
        side: "buy",
        transfer: t,
        country: t.buyerCountry,
        continent: t.buyerContinent,
        competition: t.buyerCompetition,
      });
    }
    if (t.sellerCoach) {
      out.push({
        key: normKey(t.sellerCoach),
        name: t.sellerCoach,
        side: "sell",
        transfer: t,
        country: t.sellerCountry,
        continent: t.sellerContinent,
        competition: t.sellerCompetition,
      });
    }
  }
  return out;
}

export function computeMarketRanking(
  dataset: MarketDataset,
  kind: MarketEntityKind,
  filters: MarketFilters,
): MarketRankingResult {
  const buckets = new Map<string, Bucket>();

  let globalAgeSum = 0;
  let globalAgeCount = 0;

  for (const t of dataset.transfers) {
    if (t.person_type !== "player") continue;
    if (!matchesTransferFilters(t, filters)) continue;

    if (t.age != null) {
      globalAgeSum += t.age;
      globalAgeCount += 1;
    }

    const contribs = contributionsFor(t, kind, dataset);
    for (const c of contribs) {
      if (!c.key) continue;
      let b = buckets.get(c.key);
      if (!b) {
        b = newBucket(c.key, c.name);
        buckets.set(c.key, b);
      }
      // First seen meta wins; competitions can span countries so leave null.
      if (kind !== "competition") {
        if (!b.country) b.country = c.country;
        if (!b.continent) b.continent = c.continent;
        if (!b.competition) b.competition = c.competition;
      } else {
        // For competition kind, meta is n/a beyond the name.
      }
      if (t.age != null) {
        b.ageSum += t.age;
        b.ageCount += 1;
      }
      const v = t.value > 0 ? t.value : 0;
      if (c.side === "buy") b.buysValue += v;
      else b.salesValue += v;
      if (v > 0) {
        b.valuedCount += 1;
        b.valuedSum += v;
        if (v > b.maxValue) b.maxValue = v;
      }
      b.transferCount += 1;
    }
  }

  const rows: MarketRankingRow[] = [];
  for (const b of buckets.values()) {
    if (!passesGroupFilters(b, filters, kind)) continue;

    let totalValue: number;
    if (filters.type === "buys") totalValue = b.buysValue;
    else if (filters.type === "sales") totalValue = b.salesValue;
    else if (filters.type === "net") totalValue = b.buysValue - b.salesValue;
    else totalValue = b.buysValue + b.salesValue;

    rows.push({
      key: b.key,
      name: b.name,
      totalValue,
      avgValue: b.valuedCount > 0 ? b.valuedSum / b.valuedCount : 0,
      maxValue: b.maxValue,
      avgAge: b.ageCount > 0 ? b.ageSum / b.ageCount : null,
      balance: b.buysValue - b.salesValue,
      transferCount: b.transferCount,
      buysValue: b.buysValue,
      salesValue: b.salesValue,
      ageSampleSize: b.ageCount,
      meta: {
        country: b.country,
        continent: b.continent,
        competition: b.competition,
      },
    });
  }

  rows.sort((a, b) => {
    const av = filters.type === "net" ? a.totalValue : Math.abs(a.totalValue);
    const bv = filters.type === "net" ? b.totalValue : Math.abs(b.totalValue);
    return bv - av;
  });

  return {
    rows,
    totals: {
      entities: rows.length,
      totalValue: rows.reduce((sum, r) => sum + r.totalValue, 0),
      globalAvgAge: globalAgeCount > 0 ? globalAgeSum / globalAgeCount : null,
    },
  };
}
