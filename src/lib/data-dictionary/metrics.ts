import type { MetricDef } from "./types";

// Catálogo declarativo de métricas avançadas.
// Cada entrada é reconhecida pelo mesmo resolver que atributos/estatísticas.
// Fonte única para o 3º importador ("Perfil Completo dos Jogadores") e para
// futuros módulos (Score Engine, Perfis, Data Dictionary Page).

function m(
  entry: Omit<
    MetricDef,
    "kind" | "entityKinds" | "source" | "originType" | "available" | "discoverable"
  > &
    Partial<
      Pick<
        MetricDef,
        | "entityKinds"
        | "source"
        | "originType"
        | "available"
        | "discoverable"
        | "calculated"
        | "description"
        | "tags"
      >
    >,
): MetricDef {
  return {
    kind: "metric",
    entityKinds: ["player"],
    source: "fm",
    originType: entry.calculated ? "derived" : "raw",
    available: true,
    discoverable: true,
    ...entry,
  } as MetricDef;
}

export const METRICS: MetricDef[] = [
  // ─────────── Ataque ───────────
  m({
    id: "metric.goals",
    category: "attack",
    shortName: "G",
    displayName: "Golos",
    englishName: "Goals",
    aliases: ["Goals", "Golos", "G", "Gls"],
    unit: null,
  }),
  m({
    id: "metric.goals_per90",
    category: "attack",
    shortName: "G/90",
    displayName: "Golos por 90m",
    englishName: "Goals per 90",
    aliases: ["Goals/90", "Gls/90", "G/90", "Golos/90", "Golos por 90"],
    unit: "/90",
  }),
  m({
    id: "metric.assists",
    category: "attack",
    shortName: "A",
    displayName: "Assistências",
    englishName: "Assists",
    aliases: ["Assists", "Assistências", "Assistencias", "A", "Ast"],
    unit: null,
  }),
  m({
    id: "metric.assists_per90",
    category: "attack",
    shortName: "A/90",
    displayName: "Assistências por 90m",
    englishName: "Assists per 90",
    aliases: ["Assists/90", "Ast/90", "A/90", "Assistências/90", "Assistencias/90"],
    unit: "/90",
  }),
  m({
    id: "metric.xg",
    category: "attack",
    shortName: "xG",
    displayName: "Golos Esperados",
    englishName: "Expected Goals",
    aliases: ["xG", "XG", "Expected Goals", "Golos Esperados"],
    unit: null,
  }),
  m({
    id: "metric.xg_per90",
    category: "attack",
    shortName: "xG/90",
    displayName: "xG por 90m",
    englishName: "Expected Goals per 90",
    aliases: ["xG/90", "XG/90", "Expected Goals/90", "xG per 90"],
    unit: "/90",
  }),
  m({
    id: "metric.xa",
    category: "attack",
    shortName: "xA",
    displayName: "Assistências Esperadas",
    englishName: "Expected Assists",
    aliases: ["xA", "XA", "Expected Assists", "Assistências Esperadas"],
    unit: null,
  }),
  m({
    id: "metric.xa_per90",
    category: "attack",
    shortName: "xA/90",
    displayName: "xA por 90m",
    englishName: "Expected Assists per 90",
    aliases: ["xA/90", "XA/90", "Expected Assists/90", "xA per 90"],
    unit: "/90",
  }),
  m({
    id: "metric.key_passes",
    category: "distribution",
    shortName: "KP",
    displayName: "Passes-chave",
    englishName: "Key Passes",
    aliases: ["Key Passes", "KP", "Passes-chave", "Passes chave"],
    unit: null,
  }),
  m({
    id: "metric.key_passes_per90",
    category: "distribution",
    shortName: "KP/90",
    displayName: "Passes-chave por 90m",
    englishName: "Key Passes per 90",
    aliases: ["Key Passes/90", "KP/90", "Passes-chave/90"],
    unit: "/90",
  }),
  m({
    id: "metric.chances_created",
    category: "distribution",
    shortName: "CC",
    displayName: "Oportunidades Criadas",
    englishName: "Chances Created",
    aliases: ["Chances Created", "CC", "Oportunidades Criadas", "Ch C"],
    unit: null,
  }),
  m({
    id: "metric.progressive_passes",
    category: "distribution",
    shortName: "Pr P",
    displayName: "Passes Progressivos",
    englishName: "Progressive Passes",
    aliases: ["Progressive Passes", "Pr P", "Passes Progressivos", "Prog Passes"],
    unit: null,
  }),
  m({
    id: "metric.progressive_carries",
    category: "possession",
    shortName: "Pr C",
    displayName: "Conduções Progressivas",
    englishName: "Progressive Carries",
    aliases: [
      "Progressive Carries",
      "Pr C",
      "Conduções Progressivas",
      "Conducoes Progressivas",
      "Prog Carries",
    ],
    unit: null,
  }),
  m({
    id: "metric.shot_conversion_pct",
    category: "attack",
    shortName: "Con %",
    displayName: "Conversão de Remates",
    englishName: "Shot Conversion %",
    aliases: ["Shot Conversion %", "Shot Conv %", "Con %", "Conversão %", "Conversao %"],
    unit: "%",
  }),
  m({
    id: "metric.pass_completion_pct",
    category: "distribution",
    shortName: "Pas %",
    displayName: "Passes Certos %",
    englishName: "Pass Completion %",
    aliases: ["Pass Completion %", "Pas %", "Passes Certos %", "Pass %"],
    unit: "%",
  }),
  m({
    id: "metric.cross_completion_pct",
    category: "distribution",
    shortName: "Cr %",
    displayName: "Cruzamentos Certos %",
    englishName: "Cross Completion %",
    aliases: ["Cross Completion %", "Cr %", "Cruzamentos Certos %", "Cross %"],
    unit: "%",
  }),
  m({
    id: "metric.dribbles_completed_pct",
    category: "possession",
    shortName: "Drb %",
    displayName: "Dribles Completos %",
    englishName: "Dribbles Completed %",
    aliases: ["Dribbles Completed %", "Drb %", "Dribles Completos %", "Dribble %"],
    unit: "%",
  }),

  // ─────────── Defesa ───────────
  m({
    id: "metric.tackles_won_pct",
    category: "defense",
    shortName: "Tck %",
    displayName: "Desarmes Ganhos %",
    englishName: "Tackles Won %",
    aliases: ["Tackles Won %", "Tck %", "Desarmes Ganhos %", "Tackle %"],
    unit: "%",
  }),
  m({
    id: "metric.interceptions",
    category: "defense",
    shortName: "Int",
    displayName: "Interceções",
    englishName: "Interceptions",
    aliases: ["Interceptions", "Interceções", "Intercecoes", "Int"],
    unit: null,
  }),
  m({
    id: "metric.possession_won",
    category: "defense",
    shortName: "PW",
    displayName: "Posse Recuperada",
    englishName: "Possession Won",
    aliases: ["Possession Won", "Poss Won", "PW", "Posse Recuperada"],
    unit: null,
  }),
  m({
    id: "metric.pressures",
    category: "defense",
    shortName: "Prs",
    displayName: "Pressões",
    englishName: "Pressures",
    aliases: ["Pressures", "Pressões", "Pressoes", "Prs"],
    unit: null,
  }),
  m({
    id: "metric.aerial_win_pct",
    category: "physical",
    shortName: "Aer %",
    displayName: "Duelos Aéreos Ganhos %",
    englishName: "Aerial Win %",
    aliases: ["Aerial Win %", "Aer %", "Duelos Aéreos Ganhos %", "Duelos Aereos %", "Hdr Won %"],
    unit: "%",
  }),

  // ─────────── Guarda-Redes ───────────
  m({
    id: "metric.save_pct",
    category: "goalkeeping",
    shortName: "Sv %",
    displayName: "Defesas %",
    englishName: "Save %",
    aliases: ["Save %", "Sv %", "Defesas %", "Saves %"],
    unit: "%",
  }),
  m({
    id: "metric.clean_sheet_pct",
    category: "goalkeeping",
    shortName: "CS %",
    displayName: "Jogos sem sofrer %",
    englishName: "Clean Sheet %",
    aliases: ["Clean Sheet %", "CS %", "Jogos sem sofrer %", "Clean Sheets %"],
    unit: "%",
  }),
];
