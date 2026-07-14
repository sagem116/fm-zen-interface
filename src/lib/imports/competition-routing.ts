export type CompetitionSheetType = "super_league" | "national" | "continental" | "international";

export type CompetitionSheetRole =
  | "club_information"
  | "club_classification"
  | "coach_information"
  | "competition_information"
  | "standings"
  | "bracket";

function normalizeSheetName(sheetName: string): string {
  return String(sheetName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-\/\\]+/g, "")
    .trim();
}

const SHEET_TYPE_BY_NAME: Record<string, CompetitionSheetType> = {
  superleague: "super_league",
  superliga: "super_league",
  superleagueclassificacao: "super_league",
  superligaclassificacao: "super_league",
  ligasnacionais: "national",
  liganacional: "national",
  nacional: "national",
  continentais: "continental",
  continental: "continental",
  internacionais: "international",
  internacional: "international",
};

const SHEET_ROLE_BY_NAME: Record<string, CompetitionSheetRole> = {
  clubpais: "club_information",
  paisdosclubes: "club_information",
  paisdeclubes: "club_information",
  paisclubes: "club_information",
  clubespais: "club_information",
  dadosclubes: "club_information",
  reputacaoclubes: "club_classification",
  reputacaodosclubes: "club_classification",
  reputacaodeclubes: "club_classification",
  reputacaocomp: "competition_information",
  reputacaocompeticoes: "competition_information",
  reputacaodascompeticoes: "competition_information",
  reputacaodecompeticoes: "competition_information",
  dadoscompeticoes: "competition_information",
  treinador: "coach_information",
  treinadores: "coach_information",
  dadostreinadores: "coach_information",
  dadodostreinadores: "coach_information",
  superleague: "standings",
  superliga: "standings",
  ligasnacionais: "standings",
  liganacional: "standings",
  nacional: "standings",
  continentais: "bracket",
  continental: "bracket",
  internacionais: "bracket",
  internacional: "bracket",
};

/**
 * Central, exact competition sheet mapping.
 *
 * This is the only supported Folha Excel -> Competition Type mapping and it
 * must remain exact: no heuristics, no content inspection, no substring rules.
 */
export function resolveCompetitionSheetType(sheetName: string): CompetitionSheetType | null {
  return SHEET_TYPE_BY_NAME[normalizeSheetName(sheetName)] ?? null;
}

/**
 * Central sheet routing for the competition importer.
 *
 * The parser uses this to decide which logical slice of the legacy competitions
 * workbook a given sheet represents.
 */
export function resolveCompetitionSheetRole(sheetName: string): CompetitionSheetRole | null {
  return SHEET_ROLE_BY_NAME[normalizeSheetName(sheetName)] ?? null;
}

export function toLegacyCompetitionType(
  type: CompetitionSheetType,
): "superleague" | "national" | "continental" | "international" {
  if (type === "super_league") return "superleague";
  return type;
}
