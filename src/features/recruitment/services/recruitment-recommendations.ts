import type {
  RecommendationContribution,
  RecommendationCriterionId,
  RecommendationExplain,
  RecommendationPreset,
  RecruitmentKnowledgeProfile,
} from "../types/recruitment-models";
import type { RecruitmentRecommendationsService } from "../types/recruitment-service-types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: Array<number | null | undefined>, fallback = 50): number {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (!valid.length) return fallback;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function inverse(value: number | null | undefined, max: number): number {
  if (value == null || !Number.isFinite(value) || max <= 0) return 50;
  return clamp((1 - value / max) * 100);
}

function normalizeAge(age: number | null | undefined, objective: "player" | "coach"): number {
  if (age == null || !Number.isFinite(age)) return 50;
  const ideal = objective === "coach" ? 45 : 24;
  const multiplier = objective === "coach" ? 2.8 : 4;
  return clamp(100 - Math.abs(age - ideal) * multiplier);
}

function personalityScore(value: string | null | undefined): number {
  if (!value) return 50;
  const text = value.toLowerCase();
  if (/(profissional|lider|resil|consist|ambic)/.test(text)) return 80;
  if (/(volatil|temper|inconsist|nerv)/.test(text)) return 35;
  return 60;
}

function scoreLabel(id: RecommendationCriterionId): string {
  const labels: Record<RecommendationCriterionId, string> = {
    ranking: "Ranking",
    recruitmentScore: "Recruitment Score",
    compatibility: "Compatibilidade",
    age: "Idade",
    value: "Valor",
    salary: "Salário",
    potential: "Potencial",
    risk: "Risco",
    versatility: "Versatilidade",
    personality: "Personalidade",
    consistency: "Consistência",
    form: "Forma",
    style: "Estilo",
    psychological: "Perfil Psicológico",
    scoreOverall: "Score Overall",
    scorePosition: "Score da Posição",
  };
  return labels[id];
}

function firstScoreByToken(scores: Record<string, number | null>, token: string): number | null {
  const key = Object.keys(scores).find((item) => item.toLowerCase().includes(token));
  if (!key) return null;
  const value = scores[key];
  return typeof value === "number" ? value : null;
}

function bestScore(scores: Record<string, number | null>): number {
  const values = Object.values(scores).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  return values.length ? Math.max(...values) : 50;
}

export const RECOMMENDATION_PRESETS: RecommendationPreset[] = [
  makePreset("wonderkids", "Wonderkids", "player", {
    potential: 28,
    age: 14,
    compatibility: 16,
    recruitmentScore: 14,
    risk: 10,
    value: 8,
    versatility: 6,
    style: 4,
  }),
  makePreset("elite", "Elite", "player", {
    ranking: 20,
    recruitmentScore: 22,
    compatibility: 22,
    scoreOverall: 14,
    potential: 10,
    risk: 6,
    value: 6,
  }),
  makePreset("baixo-custo", "Baixo Custo", "player", {
    value: 26,
    salary: 20,
    recruitmentScore: 16,
    compatibility: 14,
    risk: 10,
    potential: 8,
    age: 6,
  }),
  makePreset("mercado-livre", "Mercado Livre", "player", {
    value: 30,
    salary: 24,
    compatibility: 12,
    recruitmentScore: 14,
    form: 8,
    risk: 6,
    consistency: 6,
  }),
  makePreset("longo-prazo", "Longo Prazo", "player", {
    potential: 24,
    risk: 12,
    versatility: 10,
    psychological: 12,
    recruitmentScore: 16,
    compatibility: 14,
    age: 12,
  }),
  makePreset("curto-prazo", "Curto Prazo", "player", {
    form: 20,
    compatibility: 20,
    recruitmentScore: 18,
    scoreOverall: 14,
    ranking: 10,
    consistency: 10,
    risk: 8,
  }),
  makePreset("plantel-principal", "Plantel Principal", "player", {
    recruitmentScore: 24,
    compatibility: 24,
    ranking: 14,
    scoreOverall: 14,
    consistency: 10,
    style: 8,
    risk: 6,
  }),
  makePreset("rotacao", "Rotação", "player", {
    value: 18,
    salary: 16,
    versatility: 16,
    compatibility: 14,
    recruitmentScore: 16,
    form: 10,
    risk: 10,
  }),
  makePreset("projeto", "Projeto", "player", {
    potential: 20,
    psychological: 14,
    style: 12,
    versatility: 12,
    age: 10,
    recruitmentScore: 16,
    risk: 8,
    value: 8,
  }),
  makePreset("personalizado", "Personalizado", "player", {
    recruitmentScore: 25,
    compatibility: 25,
    ranking: 15,
    potential: 12,
    value: 8,
    risk: 5,
    style: 10,
  }),
  makePreset("treinador-elite", "Treinador Elite", "coach", {
    recruitmentScore: 28,
    compatibility: 22,
    ranking: 16,
    psychological: 12,
    consistency: 10,
    style: 8,
    risk: 4,
  }),
  makePreset("treinador-projeto", "Treinador Projeto", "coach", {
    style: 18,
    psychological: 18,
    consistency: 14,
    recruitmentScore: 20,
    compatibility: 16,
    ranking: 8,
    risk: 6,
  }),
];

function makePreset(
  id: string,
  name: string,
  objective: "player" | "coach",
  weights: Partial<Record<RecommendationCriterionId, number>>,
): RecommendationPreset {
  const all: RecommendationCriterionId[] = [
    "ranking",
    "recruitmentScore",
    "compatibility",
    "age",
    "value",
    "salary",
    "potential",
    "risk",
    "versatility",
    "personality",
    "consistency",
    "form",
    "style",
    "psychological",
    "scoreOverall",
    "scorePosition",
  ];

  const criteria = Object.fromEntries(
    all.map((criterion) => [
      criterion,
      {
        enabled: typeof weights[criterion] === "number" && (weights[criterion] ?? 0) > 0,
        weight: weights[criterion] ?? 0,
      },
    ]),
  ) as RecommendationPreset["criteria"];

  return {
    id,
    name,
    objective,
    criteria,
  };
}

export function recommendationValueMap(input: {
  profile: RecruitmentKnowledgeProfile;
  recruitmentScore: number;
  compatibility: number;
  maxMarketValue: number;
  maxSalary: number;
}): Record<RecommendationCriterionId, number> {
  const { profile } = input;

  const scoreOverall =
    firstScoreByToken(profile.scores, "overall") ??
    firstScoreByToken(profile.scores, "global") ??
    bestScore(profile.scores);

  const scorePosition =
    firstScoreByToken(profile.scores, "position") ??
    firstScoreByToken(profile.scores, "pos") ??
    bestScore(profile.scores);

  return {
    ranking: profile.ranking.world ? clamp(100 - profile.ranking.world / 4) : 50,
    recruitmentScore: clamp(input.recruitmentScore),
    compatibility: clamp(input.compatibility),
    age: normalizeAge(profile.market.age, profile.entityKind === "coach" ? "coach" : "player"),
    value: inverse(profile.market.value, input.maxMarketValue),
    salary: inverse(profile.market.salary, input.maxSalary),
    potential: clamp(
      profile.intelligence.potential ?? firstScoreByToken(profile.scores, "pa") ?? scoreOverall,
    ),
    risk: clamp(100 - (profile.intelligence.risk ?? 50)),
    versatility: clamp(
      profile.intelligence.versatility ??
        (profile.tactical.secondaryPositions.length
          ? 40 + profile.tactical.secondaryPositions.length * 10
          : 45),
    ),
    personality: personalityScore(profile.market.personality),
    consistency: clamp(
      profile.intelligence.consistency ?? firstScoreByToken(profile.scores, "rc") ?? 50,
    ),
    form: clamp(
      firstScoreByToken(profile.scores, "rm") ??
        firstScoreByToken(profile.scores, "form") ??
        scoreOverall,
    ),
    style: clamp(profile.intelligence.style ?? profile.tactical.compatibilityGlobal ?? 50),
    psychological: clamp(
      avg(
        profile.intelligence.psychological.map((item) => item.score),
        50,
      ),
    ),
    scoreOverall,
    scorePosition,
  };
}

export function computeRecommendationExplain(input: {
  preset: RecommendationPreset;
  values: Record<RecommendationCriterionId, number>;
  contextLabel: string;
}): RecommendationExplain {
  const enabled = (Object.keys(input.preset.criteria) as RecommendationCriterionId[]).filter(
    (criterion) => input.preset.criteria[criterion].enabled,
  );

  const totalWeight =
    enabled.reduce(
      (sum, criterion) => sum + Math.max(0, input.preset.criteria[criterion].weight),
      0,
    ) || 1;

  const contributions: RecommendationContribution[] = enabled
    .map((criterion) => {
      const weight = input.preset.criteria[criterion].weight;
      const normalizedWeight = Math.max(0, weight) / totalWeight;
      const value = clamp(input.values[criterion] ?? 50);
      const impact = value * normalizedWeight;
      return {
        criterion,
        label: scoreLabel(criterion),
        weight,
        normalizedWeight,
        value,
        impact,
        impactPercent: Number((normalizedWeight * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.impact - a.impact);

  const recommendationScore = Number(
    clamp(contributions.reduce((sum, item) => sum + item.impact, 0)).toFixed(1),
  );

  const strengths = contributions
    .filter((item) => item.value >= 65)
    .slice(0, 5)
    .map((item) => `${item.label} forte para ${input.contextLabel}.`);

  const weaknesses = contributions
    .filter((item) => item.value <= 45)
    .slice(0, 5)
    .map((item) => `${item.label} abaixo do ideal para ${input.contextLabel}.`);

  return {
    recommendationScore,
    presetId: input.preset.id,
    presetName: input.preset.name,
    contributions,
    strengths: strengths.length ? strengths : ["Sem fragilidades críticas no preset atual."],
    weaknesses: weaknesses.length
      ? weaknesses
      : ["Sem pontos fracos relevantes para os critérios ativos."],
  };
}

export const recruitmentRecommendationsService: Partial<RecruitmentRecommendationsService> = {
  async listRecommendations() {
    return [];
  },
};
