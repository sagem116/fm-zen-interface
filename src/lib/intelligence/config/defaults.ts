/**
 * Default Intelligence Engine configuration.
 *
 * Deliberately small: a couple of representative metrics/rules/traits/profiles
 * per entity kind, just enough to exercise the whole pipeline end-to-end.
 * Real catalogs will be added incrementally by registering more definitions —
 * no engine code change required.
 */

import type {
  EngineConfig,
  MetricDef,
  RuleDef,
  TraitDef,
  ProfileDef,
  NarrativeTemplate,
} from "../types";

// ---------- Metrics ----------
// Each metric reads plain fields off the domain object. Callers shape the
// domain object however they want; the engine never talks to a database.

const metrics: MetricDef[] = [
  // --- Club
  {
    id: "club.avgAge",
    kind: "club",
    label: "Idade Média do Plantel",
    unit: "anos",
    discoverable: true,
    compute: (e) => numericField(e.avgAge),
  },
  {
    id: "club.avgCA",
    kind: "club",
    label: "C.A. Médio",
    discoverable: true,
    compute: (e) => numericField(e.avgCA),
  },
  {
    id: "club.avgCP",
    kind: "club",
    label: "C.P. Médio",
    discoverable: true,
    compute: (e) => numericField(e.avgCP),
  },

  // --- Player
  {
    id: "player.age",
    kind: "player",
    label: "Idade",
    unit: "anos",
    discoverable: true,
    compute: (e) => numericField(e.age),
  },
  {
    id: "player.goalsPerGame",
    kind: "player",
    label: "Golos por Jogo",
    discoverable: true,
    compute: (e) => ratio(e.goals, e.games),
  },
  {
    id: "player.ca",
    kind: "player",
    label: "Current Ability",
    discoverable: true,
    compute: (e) => numericField(e.ca),
  },

  // --- Coach
  {
    id: "coach.titles",
    kind: "coach",
    label: "Títulos",
    discoverable: true,
    compute: (e) => numericField(e.titles),
  },
  {
    id: "coach.seasons",
    kind: "coach",
    label: "Épocas",
    discoverable: true,
    compute: (e) => numericField(e.seasons),
  },

  // --- Competition
  {
    id: "comp.avgReputation",
    kind: "competition",
    label: "Reputação Média",
    discoverable: true,
    compute: (e) => numericField(e.avgReputation),
  },
  {
    id: "comp.goalsPerGame",
    kind: "competition",
    label: "Golos por Jogo",
    discoverable: true,
    compute: (e) => numericField(e.goalsPerGame),
  },

  // --- Country
  {
    id: "country.playersAbroad",
    kind: "country",
    label: "Jogadores no Estrangeiro",
    discoverable: true,
    compute: (e) => numericField(e.playersAbroad),
  },
  {
    id: "country.internationalPoints",
    kind: "country",
    label: "Pontos Internacionais",
    discoverable: true,
    compute: (e) => numericField(e.internationalPoints),
  },
];

// ---------- Rules ----------

const rules: RuleDef[] = [
  {
    id: "rule.club.young",
    kind: "club",
    label: "Plantel Jovem",
    aggregate: "weightedMean",
    inputs: [
      { metricId: "club.avgAge", weight: 1, direction: "lower", normalize: { kind: "percentile" } },
    ],
  },
  {
    id: "rule.club.talented",
    kind: "club",
    label: "Plantel Talentoso",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "club.avgCA",
        weight: 0.5,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
      {
        metricId: "club.avgCP",
        weight: 0.5,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.player.finisher",
    kind: "player",
    label: "Finalizador",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "player.goalsPerGame",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.player.wonderkid",
    kind: "player",
    label: "Wonderkid",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "player.age",
        weight: 0.4,
        direction: "lower",
        normalize: { kind: "linear", min: 15, max: 30 },
      },
      {
        metricId: "player.ca",
        weight: 0.6,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.coach.winner",
    kind: "coach",
    label: "Vencedor",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "coach.titles",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.coach.veteran",
    kind: "coach",
    label: "Veterano",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "coach.seasons",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.comp.prestigious",
    kind: "competition",
    label: "Prestigiada",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "comp.avgReputation",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.comp.highScoring",
    kind: "competition",
    label: "Muitos Golos",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "comp.goalsPerGame",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.country.exporter",
    kind: "country",
    label: "Exportador",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "country.playersAbroad",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
  {
    id: "rule.country.powerhouse",
    kind: "country",
    label: "Potência",
    aggregate: "weightedMean",
    inputs: [
      {
        metricId: "country.internationalPoints",
        weight: 1,
        direction: "higher",
        normalize: { kind: "percentile" },
      },
    ],
  },
];

// ---------- Traits ----------

const levelsFive = [
  { min: 0.85, label: "Muito Alto" },
  { min: 0.7, label: "Alto" },
  { min: 0.55, label: "Médio" },
];

const traits: TraitDef[] = [
  {
    id: "trait.club.young",
    kind: "club",
    group: "plantel",
    label: "Clube Jovem",
    polarity: "positive",
    ruleId: "rule.club.young",
    minScore: 55,
    levels: [
      { min: 0.85, label: "Muito Jovem" },
      { min: 0.7, label: "Jovem" },
      { min: 0.55, label: "Ligeiramente Jovem" },
    ],
  },
  {
    id: "trait.club.talented",
    kind: "club",
    group: "plantel",
    label: "Plantel Talentoso",
    polarity: "positive",
    ruleId: "rule.club.talented",
    minScore: 55,
    levels: levelsFive,
  },

  {
    id: "trait.player.finisher",
    kind: "player",
    group: "estilo",
    label: "Finalizador",
    polarity: "positive",
    ruleId: "rule.player.finisher",
    minScore: 55,
    levels: levelsFive,
  },
  {
    id: "trait.player.wonderkid",
    kind: "player",
    group: "desenvolvimento",
    label: "Wonderkid",
    polarity: "positive",
    ruleId: "rule.player.wonderkid",
    minScore: 55,
    levels: levelsFive,
  },

  {
    id: "trait.coach.winner",
    kind: "coach",
    group: "competitivo",
    label: "Vencedor",
    polarity: "positive",
    ruleId: "rule.coach.winner",
    minScore: 55,
    levels: levelsFive,
  },
  {
    id: "trait.coach.veteran",
    kind: "coach",
    group: "carreira",
    label: "Veterano",
    polarity: "neutral",
    ruleId: "rule.coach.veteran",
    minScore: 55,
    levels: levelsFive,
  },

  {
    id: "trait.comp.prestigious",
    kind: "competition",
    group: "prestigio",
    label: "Prestigiada",
    polarity: "positive",
    ruleId: "rule.comp.prestigious",
    minScore: 55,
    levels: levelsFive,
  },
  {
    id: "trait.comp.highScoring",
    kind: "competition",
    group: "estilo",
    label: "Muitos Golos",
    polarity: "neutral",
    ruleId: "rule.comp.highScoring",
    minScore: 55,
    levels: levelsFive,
  },

  {
    id: "trait.country.exporter",
    kind: "country",
    group: "mercado",
    label: "Exportador",
    polarity: "positive",
    ruleId: "rule.country.exporter",
    minScore: 55,
    levels: levelsFive,
  },
  {
    id: "trait.country.powerhouse",
    kind: "country",
    group: "competitivo",
    label: "Potência",
    polarity: "positive",
    ruleId: "rule.country.powerhouse",
    minScore: 55,
    levels: levelsFive,
  },
];

// ---------- Profiles ----------

const profiles: ProfileDef[] = [
  {
    id: "profile.club.default",
    kind: "club",
    label: "Perfil Padrão de Clube",
    traitIds: ["trait.club.young", "trait.club.talented"],
  },
  {
    id: "profile.player.default",
    kind: "player",
    label: "Perfil Padrão de Jogador",
    traitIds: ["trait.player.finisher", "trait.player.wonderkid"],
  },
  {
    id: "profile.coach.default",
    kind: "coach",
    label: "Perfil Padrão de Treinador",
    traitIds: ["trait.coach.winner", "trait.coach.veteran"],
  },
  {
    id: "profile.competition.default",
    kind: "competition",
    label: "Perfil Padrão de Competição",
    traitIds: ["trait.comp.prestigious", "trait.comp.highScoring"],
  },
  {
    id: "profile.country.default",
    kind: "country",
    label: "Perfil Padrão de País",
    traitIds: ["trait.country.exporter", "trait.country.powerhouse"],
  },
];

// ---------- Narrative templates ----------

const narrativeTemplates: Record<string, NarrativeTemplate> = {
  "trait.club.young": {
    buckets: [
      {
        minScore: 0.85,
        text: ({ entity, trait }) =>
          `${entity.name} destaca-se como um dos planteis mais jovens da coorte (${trait.level ?? ""}, score ${trait.score.toFixed(0)}/100).`,
      },
      {
        minScore: 0.55,
        text: ({ entity, trait }) =>
          `${entity.name} apresenta um plantel jovem (score ${trait.score.toFixed(0)}/100).`,
      },
    ],
  },
  "trait.player.wonderkid": {
    buckets: [
      {
        minScore: 0.7,
        text: ({ entity, trait }) =>
          `${entity.name} combina juventude e talento acima da média — perfil de wonderkid (score ${trait.score.toFixed(0)}/100).`,
      },
    ],
  },
};

export const defaultConfig: EngineConfig = {
  id: "intelligence.default",
  name: "Configuração Padrão",
  version: "0.1.0",
  metrics,
  rules,
  traits,
  profiles,
  narrativeTemplates,
};

// ---------- helpers ----------

function numericField(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function ratio(num: unknown, den: unknown): number | null {
  const n = numericField(num);
  const d = numericField(den);
  if (n == null || d == null || d === 0) return null;
  return n / d;
}
