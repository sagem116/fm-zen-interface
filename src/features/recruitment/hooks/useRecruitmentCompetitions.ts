import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentCompetitions(limit = 200) {
  const { source, isLoading } = useRecruitmentSourceData();

  const competitions = useMemo(() => {
    if (!source) return [];
    return source.entities.competitions.slice(0, limit);
  }, [source, limit]);

  return { competitions, isLoading, currentSeason: source?.currentSeason ?? null };
}
