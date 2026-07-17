// Market Rankings — react-query hook.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketDataset } from "./service";
import { computeMarketRanking } from "./compute";
import type { MarketEntityKind, MarketFilters } from "./types";

export function useMarketDataset() {
  return useQuery({
    queryKey: ["market-rankings", "dataset"],
    queryFn: fetchMarketDataset,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketRanking(kind: MarketEntityKind, filters: MarketFilters) {
  const q = useMarketDataset();
  const result = useMemo(() => {
    if (!q.data) return null;
    return computeMarketRanking(q.data, kind, filters);
  }, [q.data, kind, filters]);
  return { dataset: q.data, isLoading: q.isLoading, error: q.error, result };
}
