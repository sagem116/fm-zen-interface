import type {
  MarketSnapshot,
  Recommendation,
  RecruitmentCandidate,
  RecruitmentDashboardData,
  RecruitmentNeed,
  ReplacementCandidate,
  ScoutObservation,
  ScoutReport,
  Shortlist,
} from "./recruitment-models";

export interface RecruitmentDashboardService {
  getDashboard(): Promise<RecruitmentDashboardData>;
}

export interface RecruitmentSearchService {
  searchPlayers(query: string): Promise<RecruitmentCandidate[]>;
  searchCoaches(query: string): Promise<RecruitmentCandidate[]>;
}

export interface RecruitmentShortlistsService {
  listShortlists(): Promise<Shortlist[]>;
}

export interface RecruitmentObservationsService {
  listObservations(): Promise<ScoutObservation[]>;
}

export interface RecruitmentMarketService {
  getMarketSnapshot(): Promise<MarketSnapshot>;
}

export interface RecruitmentReportsService {
  listReports(): Promise<ScoutReport[]>;
}

export interface RecruitmentRecommendationsService {
  listRecommendations(): Promise<Recommendation[]>;
}

export interface RecruitmentReplacementsService {
  listReplacementCandidates(): Promise<ReplacementCandidate[]>;
}

export interface RecruitmentNeedsService {
  listNeeds(): Promise<RecruitmentNeed[]>;
}
