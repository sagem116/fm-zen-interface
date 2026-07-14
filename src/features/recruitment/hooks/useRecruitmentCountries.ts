import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentCountries(limit = 200) {
  const { source, isLoading } = useRecruitmentSourceData();

  const countries = useMemo(() => {
    if (!source) return [];
    return source.entities.countries.slice(0, limit);
  }, [source, limit]);

  return { countries, isLoading, currentSeason: source?.currentSeason ?? null };
}
