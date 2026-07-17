// Market Rankings — public types.

export type MarketEntityKind = "competition" | "club" | "coach";

export type MarketRankingType = "all" | "buys" | "sales" | "net";

export interface MarketFilters {
  seasonFrom: number | null;
  seasonTo: number | null;
  country: string | null;
  continent: string | null;
  competition: string | null;
  type: MarketRankingType;
}

export interface MarketRankingRow {
  key: string;
  name: string;
  totalValue: number;
  avgValue: number;
  maxValue: number;
  avgAge: number | null;
  balance: number; // buys − sales
  transferCount: number;
  buysValue: number;
  salesValue: number;
  ageSampleSize: number;
  meta?: {
    country?: string | null;
    continent?: string | null;
    competition?: string | null;
  };
}

export interface MarketRankingResult {
  rows: MarketRankingRow[];
  totals: {
    entities: number;
    totalValue: number;
    globalAvgAge: number | null;
  };
}
