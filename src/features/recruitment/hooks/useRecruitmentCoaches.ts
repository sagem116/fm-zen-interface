import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentCoaches(limit = 50) {
  const { source, isLoading } = useRecruitmentSourceData();

  const coaches = useMemo(() => {
    if (!source) return [];
    return source.entities.coaches.slice(0, limit);
  }, [source, limit]);

  return { coaches, isLoading, currentSeason: source?.currentSeason ?? null };
}
