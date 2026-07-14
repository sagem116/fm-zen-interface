import type {
  CareerCreateInput,
  CareerId,
  CareerSeason,
  CareerSeasonAssessmentBundle,
  CareerSeasonCreateInput,
  CareerSeasonId,
  CareerSnapshot,
  CareerTimelineEntry,
} from "../types";
import { createDefaultPreferenceState } from "../preferences";
import { createEmptyCareerStatistics } from "../statistics";
import { createSeasonJournal } from "../journal";
import { createSeasonMuseum } from "../museum";
import { createCareerSeason } from "../season";
import { buildSeasonEndEntry, buildSeasonStartEntry, sortTimeline } from "../timeline";
import { createEmptyDnaProfile } from "../career-dna";
import type { CareerAdapters } from "../adapters";
import { noopCareerAdapters } from "../adapters";
import type { CareerRepository } from "../repositories";
import { nowIso, toCareerId } from "../utils";

export interface CareerDomain {
  createCareer(input: CareerCreateInput): CareerSnapshot;
  listCareers(): CareerSnapshot[];
  getCareer(id: CareerId): CareerSnapshot | undefined;
  setActiveCareer(id: CareerId | undefined): void;
  getActiveCareer(): CareerSnapshot | undefined;
  addSeason(careerId: CareerId, input: CareerSeasonCreateInput): CareerSnapshot;
  setSeasonAssessment(
    careerId: CareerId,
    seasonId: CareerSeasonId,
    bundle: CareerSeasonAssessmentBundle,
  ): CareerSnapshot;
  appendTimelineEntry(careerId: CareerId, entry: CareerTimelineEntry): CareerSnapshot;
  getSeasonExternalContext(
    careerId: CareerId,
    seasonId: CareerSeasonId,
  ): Promise<{
    ranking: Record<string, unknown> | null;
    intelligence: Record<string, unknown> | null;
    insights: Record<string, unknown>[];
  }>;
}

export interface CareerDomainOptions {
  repository: CareerRepository;
  adapters?: Partial<CareerAdapters>;
}

function buildInitialCareer(input: CareerCreateInput): CareerSnapshot {
  const now = nowIso();
  return {
    id: toCareerId(input.id),
    name: input.name,
    ownerName: input.ownerName,
    createdAt: now,
    updatedAt: now,
    seasons: {},
    coachIdentityBySeason: {},
    timeline: [],
    journals: {},
    museums: {},
    attachments: {},
    trophies: {},
    achievements: {},
    bestElevens: { bySeason: {} },
    hallOfFame: [],
    dna: { bySeason: {}, career: createEmptyDnaProfile() },
    preferences: createDefaultPreferenceState(20),
    statistics: createEmptyCareerStatistics(),
    seasonAssessments: {},
    transferAssessments: {},
    records: {},
    metadata: input.metadata,
  };
}

function mergeAdapters(overrides?: Partial<CareerAdapters>): CareerAdapters {
  if (!overrides) return noopCareerAdapters;
  return {
    ranking: overrides.ranking ?? noopCareerAdapters.ranking,
    intelligence: overrides.intelligence ?? noopCareerAdapters.intelligence,
    insight: overrides.insight ?? noopCareerAdapters.insight,
    score: overrides.score ?? noopCareerAdapters.score,
    profile: overrides.profile ?? noopCareerAdapters.profile,
  };
}

export class CareerDomainService implements CareerDomain {
  private readonly adapters: CareerAdapters;

  constructor(
    private readonly repository: CareerRepository,
    adapters?: Partial<CareerAdapters>,
  ) {
    this.adapters = mergeAdapters(adapters);
  }

  createCareer(input: CareerCreateInput): CareerSnapshot {
    const career = buildInitialCareer(input);
    this.repository.save(career);
    this.repository.setActiveCareer(career.id);
    return career;
  }

  listCareers(): CareerSnapshot[] {
    return this.repository.list();
  }

  getCareer(id: CareerId): CareerSnapshot | undefined {
    return this.repository.get(id);
  }

  setActiveCareer(id: CareerId | undefined): void {
    this.repository.setActiveCareer(id);
  }

  getActiveCareer(): CareerSnapshot | undefined {
    const snapshot = this.repository.getStoreSnapshot();
    if (!snapshot.activeCareerId) return undefined;
    return snapshot.careers[snapshot.activeCareerId];
  }

  addSeason(careerId: CareerId, input: CareerSeasonCreateInput): CareerSnapshot {
    const career = this.requireCareer(careerId);
    const season = createCareerSeason(input);
    career.seasons[season.id] = season;
    career.currentSeasonId = season.id;
    career.coachIdentityBySeason[season.id] = {
      name: season.coach,
      club: season.club,
      country: season.country,
      mainCompetition: season.league,
    };
    career.journals[season.id] = createSeasonJournal(season.id);
    career.museums[season.id] = createSeasonMuseum(season.id);
    career.dna.bySeason[season.id] = createEmptyDnaProfile(season.id);
    career.timeline = sortTimeline([
      ...career.timeline,
      buildSeasonStartEntry(season),
      buildSeasonEndEntry(season),
    ]);
    career.updatedAt = nowIso();
    this.repository.save(career);
    return career;
  }

  setSeasonAssessment(
    careerId: CareerId,
    seasonId: CareerSeasonId,
    bundle: CareerSeasonAssessmentBundle,
  ): CareerSnapshot {
    const career = this.requireCareer(careerId);
    this.requireSeason(career, seasonId);
    career.seasonAssessments[seasonId] = {
      ...bundle,
      seasonId,
      updatedAt: nowIso(),
    };
    career.updatedAt = nowIso();
    this.repository.save(career);
    return career;
  }

  appendTimelineEntry(careerId: CareerId, entry: CareerTimelineEntry): CareerSnapshot {
    const career = this.requireCareer(careerId);
    this.requireSeason(career, entry.seasonId);
    career.timeline = sortTimeline([...career.timeline, entry]);
    career.updatedAt = nowIso();
    this.repository.save(career);
    return career;
  }

  async getSeasonExternalContext(
    careerId: CareerId,
    seasonId: CareerSeasonId,
  ): Promise<{
    ranking: Record<string, unknown> | null;
    intelligence: Record<string, unknown> | null;
    insights: Record<string, unknown>[];
  }> {
    const career = this.requireCareer(careerId);
    const season = this.requireSeason(career, seasonId);
    const [ranking, intelligence, insights] = await Promise.all([
      this.adapters.ranking.getSeasonRankingContext({ seasonId, season: season.season }),
      this.adapters.intelligence.getSeasonIntelligenceContext({ seasonId, season: season.season }),
      this.adapters.insight.getSeasonInsights({ seasonId, season: season.season }),
    ]);
    return { ranking, intelligence, insights };
  }

  private requireCareer(careerId: CareerId): CareerSnapshot {
    const career = this.repository.get(careerId);
    if (!career) throw new Error(`[career] not found: ${careerId}`);
    return career;
  }

  private requireSeason(career: CareerSnapshot, seasonId: CareerSeasonId): CareerSeason {
    const season = career.seasons[seasonId];
    if (!season) throw new Error(`[career] season not found: ${seasonId}`);
    return season;
  }
}

export function createCareerDomain(options: CareerDomainOptions): CareerDomainService {
  return new CareerDomainService(options.repository, options.adapters);
}
