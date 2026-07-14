import type {
  RecruitmentEntity,
  RecruitmentPlayer,
  RecruitmentCoach,
  RecruitmentClub,
  RecruitmentCompetition,
  RecruitmentCountry,
} from "../types/recruitment-models";

export interface RecruitmentSearchProvider {
  searchPlayers(query: string): RecruitmentPlayer[];
  searchCoaches(query: string): RecruitmentCoach[];
  searchClubs(query: string): RecruitmentClub[];
  searchCompetitions(query: string): RecruitmentCompetition[];
  searchCountries(query: string): RecruitmentCountry[];
  globalSearch(query: string): RecruitmentEntity[];
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filterByName<T extends { name: string }>(items: T[], query: string, max = 30): T[] {
  const q = norm(query.trim());
  if (!q) return items.slice(0, max);
  return items.filter((item) => norm(item.name).includes(q)).slice(0, max);
}

export function createRecruitmentSearchProvider(input: {
  players: RecruitmentPlayer[];
  coaches: RecruitmentCoach[];
  clubs: RecruitmentClub[];
  competitions: RecruitmentCompetition[];
  countries: RecruitmentCountry[];
  entities: RecruitmentEntity[];
}): RecruitmentSearchProvider {
  return {
    searchPlayers: (query: string) => filterByName(input.players, query),
    searchCoaches: (query: string) => filterByName(input.coaches, query),
    searchClubs: (query: string) => filterByName(input.clubs, query),
    searchCompetitions: (query: string) => filterByName(input.competitions, query),
    searchCountries: (query: string) => filterByName(input.countries, query),
    globalSearch: (query: string) => filterByName(input.entities, query, 50),
  };
}
