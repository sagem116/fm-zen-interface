import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentClubs(limit = 200) {
  const { source, isLoading } = useRecruitmentSourceData();

  const clubs = useMemo(() => {
    if (!source) return [];
    return source.entities.clubs.slice(0, limit);
  }, [source, limit]);

  return { clubs, isLoading, currentSeason: source?.currentSeason ?? null };
}
