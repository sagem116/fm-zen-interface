import type { CareerEntityKind, CareerSeason, CareerSeasonId } from "../types";

export interface RankingAdapter {
  getSeasonRankingContext(input: {
    seasonId: CareerSeasonId;
    season: number;
  }): Promise<Record<string, unknown> | null>;
}

export interface IntelligenceAdapter {
  getSeasonIntelligenceContext(input: {
    seasonId: CareerSeasonId;
    season: number;
  }): Promise<Record<string, unknown> | null>;
}

export interface InsightAdapter {
  getSeasonInsights(input: {
    seasonId: CareerSeasonId;
    season: number;
  }): Promise<Record<string, unknown>[]>;
}

export interface ScoreAdapter {
  getSeasonScores(input: {
    seasonId: CareerSeasonId;
    season: number;
    entityKind: CareerEntityKind;
    entityName: string;
  }): Promise<Record<string, unknown>[]>;
}

export interface ProfileAdapter {
  getProfileSnapshot(input: {
    season: CareerSeason;
    entityKind: CareerEntityKind;
    entityName: string;
  }): Promise<Record<string, unknown> | null>;
}

export interface CareerAdapters {
  ranking: RankingAdapter;
  intelligence: IntelligenceAdapter;
  insight: InsightAdapter;
  score: ScoreAdapter;
  profile: ProfileAdapter;
}

export const noopCareerAdapters: CareerAdapters = {
  ranking: {
    async getSeasonRankingContext() {
      return null;
    },
  },
  intelligence: {
    async getSeasonIntelligenceContext() {
      return null;
    },
  },
  insight: {
    async getSeasonInsights() {
      return [];
    },
  },
  score: {
    async getSeasonScores() {
      return [];
    },
  },
  profile: {
    async getProfileSnapshot() {
      return null;
    },
  },
};
