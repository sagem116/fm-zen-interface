export const RECRUITMENT_PREFERENCES_KEY = "fm-recruitment-preferences-v1";

export const RECRUITMENT_DEFAULT_PREFERENCES = {
  defaultView: "dashboard",
  resultsPerPage: 25,
  layout: "grid",
  favoriteFilters: [] as string[],
  visibleColumns: ["name", "club", "country", "score"] as string[],
  sortBy: "score",
  sortDirection: "desc" as "asc" | "desc",
};

export type RecruitmentPreferences = typeof RECRUITMENT_DEFAULT_PREFERENCES;
