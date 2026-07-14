// Catálogo declarativo das secções de exportação e presets de administração.

export type SectionKey =
  // Configuração
  | "dictionary"
  | "scoreStudio"
  | "intelligenceStudio"
  | "settings"
  | "weights"
  | "customRankings"
  | "formulas"
  | "favorites"
  | "layout"
  | "preferences"
  // Universo FM
  | "imports"
  | "players"
  | "clubs"
  | "coaches"
  | "countries"
  | "continents"
  | "competitions"
  | "standings"
  | "statistics"
  // Análise
  | "rankings"
  | "scores"
  | "hallOfFame"
  | "history"
  | "snapshots"
  // Carreira
  | "career"
  | "challenges"
  | "achievements"
  // Cache
  | "cache";

export interface SectionDef {
  key: SectionKey;
  label: string;
  group: "config" | "universe" | "analysis" | "career" | "cache";
}

export const SECTIONS: SectionDef[] = [
  { key: "dictionary", label: "Dictionary", group: "config" },
  { key: "scoreStudio", label: "Score Studio", group: "config" },
  { key: "intelligenceStudio", label: "Intelligence Studio", group: "config" },
  { key: "settings", label: "Configurações", group: "config" },
  { key: "weights", label: "Pesos", group: "config" },
  { key: "customRankings", label: "Rankings Personalizados", group: "config" },
  { key: "formulas", label: "Fórmulas", group: "config" },
  { key: "favorites", label: "Favoritos", group: "config" },
  { key: "layout", label: "Layout", group: "config" },
  { key: "preferences", label: "Preferências", group: "config" },

  { key: "imports", label: "Imports", group: "universe" },
  { key: "players", label: "Jogadores", group: "universe" },
  { key: "clubs", label: "Clubes", group: "universe" },
  { key: "coaches", label: "Treinadores", group: "universe" },
  { key: "countries", label: "Países", group: "universe" },
  { key: "continents", label: "Continentes", group: "universe" },
  { key: "competitions", label: "Competições", group: "universe" },
  { key: "standings", label: "Classificações", group: "universe" },
  { key: "statistics", label: "Estatísticas", group: "universe" },

  { key: "rankings", label: "Rankings", group: "analysis" },
  { key: "scores", label: "Scores", group: "analysis" },
  { key: "hallOfFame", label: "Hall of Fame", group: "analysis" },
  { key: "history", label: "Histórico", group: "analysis" },
  { key: "snapshots", label: "Snapshots", group: "analysis" },

  { key: "career", label: "Career Center", group: "career" },
  { key: "challenges", label: "Desafios", group: "career" },
  { key: "achievements", label: "Conquistas", group: "career" },

  { key: "cache", label: "Cache", group: "cache" },
];

export const GROUP_LABEL: Record<SectionDef["group"], string> = {
  config: "Configuração",
  universe: "Universo FM",
  analysis: "Análise",
  career: "Carreira",
  cache: "Cache (opcional)",
};

export type PresetKey = "config" | "universe" | "rankings" | "career" | "all" | "custom";

export const PRESETS: Record<Exclude<PresetKey, "custom">, SectionKey[]> = {
  config: [
    "dictionary",
    "scoreStudio",
    "settings",
    "weights",
    "formulas",
    "layout",
    "preferences",
    "customRankings",
    "favorites",
    "intelligenceStudio",
  ],
  universe: [
    "imports",
    "players",
    "clubs",
    "coaches",
    "competitions",
    "countries",
    "continents",
    "standings",
    "statistics",
  ],
  rankings: ["rankings", "scores", "hallOfFame", "history", "snapshots"],
  career: ["career", "challenges", "achievements"],
  all: SECTIONS.filter((s) => s.key !== "cache").map((s) => s.key),
};

export function emptySelection(): Record<SectionKey, boolean> {
  return SECTIONS.reduce(
    (acc, s) => {
      acc[s.key] = false;
      return acc;
    },
    {} as Record<SectionKey, boolean>,
  );
}

export function selectionFromPreset(
  preset: Exclude<PresetKey, "custom">,
): Record<SectionKey, boolean> {
  const sel = emptySelection();
  for (const k of PRESETS[preset]) sel[k] = true;
  return sel;
}
