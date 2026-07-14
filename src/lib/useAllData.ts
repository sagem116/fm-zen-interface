// Shared cache for the heavy `fetchAllData()` snapshot.
//
// Multiple hooks/screens need the exact same relational snapshot
// (`useRankings`, `useRankingsNoDecay`, `fm-notifications`,
// `ClubReputationImporter`, ...). Using different `queryKey`s means each
// one triggers its own network round-trip. This module gives every caller
// the same cache slot so a single fetch feeds them all.

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchAllData, type AllData } from "./fm-db";

/** Cache slot shared by every consumer of `fetchAllData()`. */
export const ALL_DATA_QUERY_KEY = ["fm-all-data", "v3-refresh-after-import"] as const;

const ALL_DATA_QUERY_OPTIONS = {
  queryKey: ALL_DATA_QUERY_KEY as unknown as readonly unknown[],
  queryFn: fetchAllData,
  staleTime: 24 * 60 * 60 * 1000, // 24h — invalidated explicitly on import/config save
  gcTime: 7 * 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false as const,
  refetchOnReconnect: false,
};

/** Prime or read the shared snapshot inside another `queryFn`. */
export function ensureAllData(qc: QueryClient): Promise<AllData> {
  return qc.ensureQueryData<AllData>(ALL_DATA_QUERY_OPTIONS);
}

/** React hook for components that just want the snapshot itself. */
export function useAllData() {
  return useQuery<AllData>(ALL_DATA_QUERY_OPTIONS);
}

/** Helper for hooks that need `queryClient` inline. */
export function useAllDataClient() {
  return useQueryClient();
}
