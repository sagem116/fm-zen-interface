import type {
  MarketSnapshot,
  RecruitmentClub,
  RecruitmentCompetition,
  RecruitmentCoach,
  RecruitmentKpiTotals,
  RecruitmentPlayer,
} from "../types/recruitment-models";

export interface RecruitmentMarketProvider {
  totals: RecruitmentKpiTotals;
  marketSnapshot: MarketSnapshot;
  players: RecruitmentPlayer[];
  coaches: RecruitmentCoach[];
  clubs: RecruitmentClub[];
  competitions: RecruitmentCompetition[];
}

export function createRecruitmentMarketProvider(input: {
  totals: RecruitmentKpiTotals;
  marketSnapshot: MarketSnapshot;
  players: RecruitmentPlayer[];
  coaches: RecruitmentCoach[];
  clubs: RecruitmentClub[];
  competitions: RecruitmentCompetition[];
}): RecruitmentMarketProvider {
  return {
    totals: input.totals,
    marketSnapshot: input.marketSnapshot,
    players: input.players,
    coaches: input.coaches,
    clubs: input.clubs,
    competitions: input.competitions,
  };
}
