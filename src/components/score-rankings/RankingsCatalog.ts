import type { ScoreDefinition, ScoreEntityKind } from "@/lib/scores";

/**
 * Pure UI grouping over `listScores()` — no business logic, no calculations.
 * Consumed by RankingsSidebar to render 1- or 2-level trees.
 */

export type PlayerFamily = "goalkeeper" | "defender" | "midfielder" | "forward";

export interface CatalogLeaf {
  score: ScoreDefinition;
}

export interface CatalogGroup {
  id: string;
  label: string;
  scores: ScoreDefinition[];
  /** Optional second-level grouping (players only). */
  subgroups?: CatalogSubgroup[];
}

export interface CatalogSubgroup {
  id: PlayerFamily;
  label: string;
  scores: ScoreDefinition[];
}

const CLUB_LABELS: Record<string, string> = {
  "score_category.club_style": "Estilo",
  "score_category.club_results": "Resultados",
  "score_category.club_market": "Mercado",
  "score_category.club_development": "Desenvolvimento",
  "score_category.club_historical": "Histórico",
  "score_category.club_finance": "Financeiro",
  "score_category.club_management": "Gestão",
};

const COUNTRY_LABELS: Record<string, string> = {
  "score_category.country_potency": "Potência",
  "score_category.country_power": "Potência",
  "score_category.country_development": "Desenvolvimento",
  "score_category.country_market": "Mercado",
  "score_category.country_style": "Estilo",
  "score_category.country_results": "Resultados",
  "score_category.country_historical": "Histórico",
};

const COMPETITION_TYPE_LABELS: Record<string, string> = {
  super_league: "Super League",
  national: "Ligas Nacionais",
  domestic: "Ligas Nacionais",
  continental: "Competições Continentais",
  international: "Competições Internacionais",
};

const COMPETITION_CATEGORY_LABELS: Record<string, string> = {
  "score_category.competition_style": "Estilo",
  "score_category.competition_results": "Resultados",
  "score_category.competition_growth": "Desenvolvimento",
  "score_category.competition_historical": "Histórico",
  "score_category.competition_finance": "Financeiro",
  "score_category.competition_management": "Gestão",
};

const PLAYER_FAMILY_BY_CATEGORY: Record<string, PlayerFamily> = {
  "score_category.player_goalkeeper": "goalkeeper",
  "score_category.player_defender": "defender",
  "score_category.player_midfielder": "midfielder",
  "score_category.player_forward": "forward",
};

const PLAYER_FAMILY_LABEL: Record<PlayerFamily, string> = {
  goalkeeper: "Goalkeepers",
  defender: "Defenders",
  midfielder: "Midfielders",
  forward: "Forwards",
};

function pushInto<K extends string>(
  map: Map<K, ScoreDefinition[]>,
  key: K,
  score: ScoreDefinition,
): void {
  const arr = map.get(key);
  if (arr) arr.push(score);
  else map.set(key, [score]);
}

function sortByName(list: ScoreDefinition[]): ScoreDefinition[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
}

/** Group player scores by family (goalkeeper/def/mid/fwd) using categoryId. */
export function buildPlayerCatalog(scores: ScoreDefinition[]): CatalogGroup[] {
  const byFamily = new Map<PlayerFamily, ScoreDefinition[]>();
  const orphans: ScoreDefinition[] = [];

  for (const score of scores) {
    if (score.entityKind !== "player") continue;
    const family = PLAYER_FAMILY_BY_CATEGORY[score.categoryId];
    if (family) pushInto(byFamily, family, score);
    else orphans.push(score);
  }

  const order: PlayerFamily[] = ["goalkeeper", "defender", "midfielder", "forward"];
  const groups: CatalogGroup[] = [];

  for (const family of order) {
    const list = byFamily.get(family);
    if (!list || list.length === 0) continue;
    groups.push({
      id: family,
      label: PLAYER_FAMILY_LABEL[family],
      scores: sortByName(list),
    });
  }

  if (orphans.length) {
    groups.push({ id: "other", label: "Outros", scores: sortByName(orphans) });
  }

  return groups;
}

/** Simple 1-level grouping by categoryId with human labels. */
function groupByCategory(
  scores: ScoreDefinition[],
  labels: Record<string, string>,
): CatalogGroup[] {
  const byCat = new Map<string, ScoreDefinition[]>();
  for (const score of scores) pushInto(byCat, score.categoryId, score);

  const groups: CatalogGroup[] = [];
  for (const [catId, list] of byCat) {
    groups.push({
      id: catId,
      label: labels[catId] ?? "Outros",
      scores: sortByName(list),
    });
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
}

export function buildClubCatalog(scores: ScoreDefinition[]): CatalogGroup[] {
  return groupByCategory(
    scores.filter((s) => s.entityKind === "club"),
    CLUB_LABELS,
  );
}

export function buildCountryCatalog(scores: ScoreDefinition[]): CatalogGroup[] {
  return groupByCategory(
    scores.filter((s) => s.entityKind === "country"),
    COUNTRY_LABELS,
  );
}

/**
 * Competitions: prefer tag-based type grouping (Super League / National /
 * Continental / International) when tags are present, otherwise fall back
 * to categoryId labels.
 */
export function buildCompetitionCatalog(scores: ScoreDefinition[]): CatalogGroup[] {
  const compScores = scores.filter((s) => s.entityKind === "competition");
  const byType = new Map<string, ScoreDefinition[]>();
  const byCategory: ScoreDefinition[] = [];

  for (const score of compScores) {
    const tags = (score.tags ?? []).map((t) => t.toLowerCase());
    const type = tags.find((t) => t in COMPETITION_TYPE_LABELS);
    if (type) pushInto(byType, type, score);
    else byCategory.push(score);
  }

  const groups: CatalogGroup[] = [];
  for (const key of Object.keys(COMPETITION_TYPE_LABELS)) {
    const list = byType.get(key);
    if (!list || !list.length) continue;
    groups.push({ id: key, label: COMPETITION_TYPE_LABELS[key], scores: sortByName(list) });
  }
  if (byCategory.length) {
    groups.push(...groupByCategory(byCategory, COMPETITION_CATEGORY_LABELS));
  }
  return groups;
}

export function buildCatalog(
  scores: ScoreDefinition[],
  entityKind: ScoreEntityKind,
): CatalogGroup[] {
  switch (entityKind) {
    case "player":
      return buildPlayerCatalog(scores);
    case "club":
      return buildClubCatalog(scores);
    case "competition":
      return buildCompetitionCatalog(scores);
    case "country":
      return buildCountryCatalog(scores);
    default:
      return [];
  }
}
