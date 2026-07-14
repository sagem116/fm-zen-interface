import type { RecruitmentEntity } from "../types/recruitment-models";

export interface RecruitmentStatsBundle {
  metrics?: Record<string, number | string | null>;
  attributes?: Record<string, number | string | null>;
  ranking?: number | null;
  score?: number | null;
  history?: Array<Record<string, unknown>>;
}

export interface RecruitmentStatsProvider {
  getStats(entity: RecruitmentEntity): RecruitmentStatsBundle;
}

export function createRecruitmentStatsProvider(): RecruitmentStatsProvider {
  return {
    getStats: (entity) => ({
      metrics:
        entity.metadata && typeof entity.metadata === "object"
          ? ((entity.metadata as Record<string, unknown>).metrics as
              Record<string, number | string | null> | undefined)
          : undefined,
      attributes:
        entity.metadata && typeof entity.metadata === "object"
          ? ((entity.metadata as Record<string, unknown>).attributes as
              Record<string, number | string | null> | undefined)
          : undefined,
      ranking: entity.ranking ?? null,
      score: entity.score ?? null,
      history: undefined,
    }),
  };
}
