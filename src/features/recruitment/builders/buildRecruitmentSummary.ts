import type {
  RecruitmentDashboardData,
  RecruitmentKpiTotals,
  RecruitmentTarget,
} from "../types/recruitment-models";
import type { MarketSnapshot } from "../types/recruitment-models";

export interface BuildRecruitmentSummaryInput {
  totals: RecruitmentKpiTotals;
  marketSnapshot: MarketSnapshot;
  favorites: {
    players: RecruitmentTarget[];
    clubs: RecruitmentTarget[];
    coaches: RecruitmentTarget[];
  };
  recentProfiles: {
    players: RecruitmentTarget[];
    clubs: RecruitmentTarget[];
    coaches: RecruitmentTarget[];
  };
  lastUpdatedAt: string | null;
}

export function buildRecruitmentSummary(
  input: BuildRecruitmentSummaryInput,
): RecruitmentDashboardData {
  return {
    totals: input.totals,
    marketSnapshot: input.marketSnapshot,
    favorites: input.favorites,
    recentProfiles: input.recentProfiles,
    lastUpdatedAt: input.lastUpdatedAt,
  };
}
