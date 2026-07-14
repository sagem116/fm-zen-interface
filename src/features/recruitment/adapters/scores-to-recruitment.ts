export interface RecruitmentScoreAdapter {
  // Placeholder adapter contract for future score integration.
  // This module intentionally has no business logic in phase 1.1.
  toRecruitmentScore(value: number): number;
}

export const defaultRecruitmentScoreAdapter: RecruitmentScoreAdapter = {
  toRecruitmentScore: (value) => value,
};
