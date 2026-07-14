import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentEntities() {
  const { source, isLoading } = useRecruitmentSourceData();

  const search = useMemo(() => {
    if (!source) {
      return {
        searchPlayers: (_query: string) => [],
        searchCoaches: (_query: string) => [],
        searchClubs: (_query: string) => [],
        searchCompetitions: (_query: string) => [],
        searchCountries: (_query: string) => [],
        globalSearch: (_query: string) => [],
      };
    }
    return source.providers.search;
  }, [source]);

  return {
    isLoading,
    currentSeason: source?.currentSeason ?? null,
    entities: source?.entities.entities ?? [],
    players: source?.playerUniverse?.list ?? [],
    coaches: source?.entities.coaches ?? [],
    clubs: source?.entities.clubs ?? [],
    competitions: source?.entities.competitions ?? [],
    countries: source?.entities.countries ?? [],
    ...search,
  };
}
