import type {
  RecruitmentEntity,
  RecruitmentEntityKind,
  RecruitmentKnowledgeProfile,
  RecruitmentScoreContribution,
  RecruitmentScoreExplanation,
  RecruitmentScorePreset,
} from "../types/recruitment-models";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function avg(values: Array<number | null | undefined>, fallback = 0): number {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (!valid.length) return fallback;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function normalizeRanking(rank: number | null | undefined, total: number): number {
  if (!rank || total <= 1) return 50;
  const pct = (total - rank) / (total - 1);
  return clamp(pct * 100);
}

function normalizeAge(age: number | null | undefined, kind: RecruitmentEntityKind): number {
  if (!age || age <= 0) return 50;
  if (kind === "coach") {
    const ideal = 45;
    return clamp(100 - Math.abs(age - ideal) * 3);
  }
  const ideal = 24;
  return clamp(100 - Math.abs(age - ideal) * 4);
}

function inverseCost(value: number | null | undefined, maxValue: number): number {
  if (value == null || maxValue <= 0) return 50;
  return clamp((1 - value / maxValue) * 100);
}

function normalizeHistory(events: number): number {
  if (events <= 0) return 35;
  return clamp(35 + Math.log10(events + 1) * 32);
}

function normalizeRisk(value: number | null | undefined): number {
  if (value == null) return 50;
  return clamp(100 - value);
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export interface RecruitmentScoreContext {
  rankingPoolSize: number;
  maxMarketValue: number;
  maxSalary: number;
}

export function buildRecruitmentKnowledgeProfile(input: {
  entity: RecruitmentEntity;
  season: number | null;
  scoreDefinitions: Array<{ id: string; name: string }>;
  tactical?: {
    global: number;
    offensive: number;
    defensive: number;
    technical: number;
    physical: number;
    mental: number;
    radar: Array<{ label: string; value: number }>;
    primaryPosition?: string | null;
    secondaryPositions?: string[];
    style?: string;
  } | null;
  intelligence?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    trends?: string[];
    development?: Array<{ season: number; score: number }>;
    psychological?: Array<{ label: string; score: number }>;
    risk?: number;
    potential?: number;
    intelligence?: number;
    consistency?: number;
    versatility?: number;
    style?: number;
  } | null;
  market?: {
    age?: number | null;
    marketValue?: number | null;
    salary?: number | null;
    contract?: string | null;
    reputation?: number | null;
    personality?: string | null;
  };
  history?: {
    reportIds: string[];
    observationIds: string[];
    timelineIds: string[];
  };
  ranking?: {
    world: number | null;
    historical: number | null;
    national: number | null;
    position: number | null;
  };
  scoreById?: Record<string, number | null | undefined>;
}): RecruitmentKnowledgeProfile {
  const metadata = (input.entity.metadata ?? {}) as Record<string, unknown>;

  const scoreValues: Record<string, number | null> = {};
  for (const def of input.scoreDefinitions) {
    const explicit = input.scoreById?.[def.id];
    const direct = metadata[def.id];
    const score = explicit ?? (typeof direct === "number" ? direct : null);
    scoreValues[def.id] = typeof score === "number" ? score : (input.entity.score ?? null);
  }

  return {
    id: input.entity.id,
    entityKind: input.entity.type,
    name: input.entity.name,
    general: {
      id: input.entity.id,
      type: input.entity.type,
      name: input.entity.name,
      club: input.entity.club ?? null,
      country: input.entity.country ?? null,
      competition: input.entity.competition ?? null,
      season: input.season ?? null,
    },
    ranking: {
      world: input.ranking?.world ?? input.entity.ranking ?? null,
      historical: input.ranking?.historical ?? null,
      national: input.ranking?.national ?? null,
      position: input.ranking?.position ?? null,
    },
    scores: scoreValues,
    tactical: {
      compatibilityGlobal: input.tactical?.global ?? null,
      offensive: input.tactical?.offensive ?? null,
      defensive: input.tactical?.defensive ?? null,
      technical: input.tactical?.technical ?? null,
      physical: input.tactical?.physical ?? null,
      mental: input.tactical?.mental ?? null,
      radar: input.tactical?.radar ?? [],
      primaryPosition: input.tactical?.primaryPosition ?? null,
      secondaryPositions: input.tactical?.secondaryPositions ?? [],
      style: input.tactical?.style ?? null,
    },
    intelligence: {
      summary: input.intelligence?.summary ?? null,
      strengths: input.intelligence?.strengths ?? [],
      weaknesses: input.intelligence?.weaknesses ?? [],
      trends: input.intelligence?.trends ?? [],
      development: input.intelligence?.development ?? [],
      psychological: input.intelligence?.psychological ?? [],
      risk: input.intelligence?.risk ?? null,
      potential: input.intelligence?.potential ?? null,
      intelligence: input.intelligence?.intelligence ?? null,
      consistency: input.intelligence?.consistency ?? null,
      versatility: input.intelligence?.versatility ?? null,
      style: input.intelligence?.style ?? null,
    },
    market: {
      age: input.market?.age ?? finiteOrNull(asNumber(metadata.age, NaN)),
      value: input.market?.marketValue ?? finiteOrNull(asNumber(metadata.marketValue, NaN)),
      salary: input.market?.salary ?? finiteOrNull(asNumber(metadata.salary, NaN)),
      contract:
        input.market?.contract ??
        (typeof metadata.contract === "string" ? metadata.contract : null),
      reputation: input.market?.reputation ?? finiteOrNull(asNumber(metadata.reputation, NaN)),
      personality:
        input.market?.personality ??
        (typeof metadata.personality === "string" ? metadata.personality : null),
    },
    history: {
      reportIds: input.history?.reportIds ?? [],
      observationIds: input.history?.observationIds ?? [],
      timelineIds: input.history?.timelineIds ?? [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function computeRecruitmentScore(
  profile: RecruitmentKnowledgeProfile,
  preset: RecruitmentScorePreset,
  ctx: RecruitmentScoreContext,
): {
  value: number;
  explain: RecruitmentScoreExplanation;
} {
  const enabled = Object.entries(preset.criteria).filter(([, cfg]) => cfg.enabled);
  const totalWeight = enabled.reduce((sum, [, cfg]) => sum + Math.max(0, cfg.weight), 0) || 1;

  const scoresPool = Object.entries(profile.scores)
    .filter(
      ([scoreId]) =>
        preset.scoreSelectionMode === "all" || preset.selectedScoreIds.includes(scoreId),
    )
    .map(([, value]) => (typeof value === "number" ? clamp(value) : null));

  const values: Record<string, number> = {
    ranking: normalizeRanking(profile.ranking.world, ctx.rankingPoolSize),
    scores: avg(scoresPool, 50),
    tacticalCompatibility: profile.tactical.compatibilityGlobal ?? 50,
    psychological: avg(
      profile.intelligence.psychological.map((item) => item.score),
      50,
    ),
    potential: profile.intelligence.potential ?? avg([profile.scores.cp, profile.scores.pa], 55),
    age: normalizeAge(profile.market.age, profile.entityKind),
    value: inverseCost(profile.market.value, ctx.maxMarketValue),
    salary: inverseCost(profile.market.salary, ctx.maxSalary),
    form: avg([profile.scores.current, profile.scores.ca, profile.scores.rm], 50),
    consistency:
      profile.intelligence.consistency ?? avg([profile.scores.rc, profile.scores.ra], 50),
    versatility:
      profile.intelligence.versatility ??
      (profile.tactical.secondaryPositions.length
        ? clamp(35 + profile.tactical.secondaryPositions.length * 18)
        : 40),
    style: profile.intelligence.style ?? profile.tactical.compatibilityGlobal ?? 50,
    risk: normalizeRisk(profile.intelligence.risk),
    intelligence:
      profile.intelligence.intelligence ??
      avg([profile.tactical.mental, profile.tactical.technical], 50),
    history: normalizeHistory(
      profile.history.reportIds.length +
        profile.history.observationIds.length +
        profile.history.timelineIds.length,
    ),
  };

  const contributions: RecruitmentScoreContribution[] = enabled.map(([id, cfg]) => {
    const value = values[id] ?? 50;
    const normalizedWeight = Math.max(0, cfg.weight) / totalWeight;
    return {
      criterion: id,
      weight: cfg.weight,
      normalizedWeight,
      value,
      impact: value * normalizedWeight,
    };
  });

  const scoreValue = clamp(contributions.reduce((sum, item) => sum + item.impact, 0));

  return {
    value: Number(scoreValue.toFixed(1)),
    explain: {
      value: Number(scoreValue.toFixed(1)),
      presetId: preset.id,
      presetName: preset.name,
      contributions: contributions
        .sort((a, b) => b.impact - a.impact)
        .map((item) => ({
          ...item,
          impactPercent: Number((item.normalizedWeight * 100).toFixed(1)),
        })),
    },
  };
}
