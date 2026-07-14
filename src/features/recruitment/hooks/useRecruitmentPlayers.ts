import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentPlayers(limit = 50) {
  const { source, isLoading } = useRecruitmentSourceData();

  const players = useMemo(() => {
    if (!source) return [];
    return (source.playerUniverse?.list ?? []).slice(0, limit);
  }, [source, limit]);

  return { players, isLoading, currentSeason: source?.currentSeason ?? null };
}
