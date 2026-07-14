import type {
  CareerSeason,
  CareerTimelineEntry,
  CareerTimelineEventType,
  TimelineEntryId,
} from "../types";
import { nowIso, toTimelineEntryId } from "../utils";

export interface TimelineEntryCreateInput {
  id?: TimelineEntryId;
  season: CareerSeason;
  eventType: CareerTimelineEventType;
  title: string;
  description?: string;
  club?: string;
  country?: string;
  competition?: string;
}

export function createTimelineEntry(input: TimelineEntryCreateInput): CareerTimelineEntry {
  return {
    id: toTimelineEntryId(input.id),
    seasonId: input.season.id,
    season: input.season.season,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    club: input.club ?? input.season.club,
    country: input.country ?? input.season.country,
    competition: input.competition ?? input.season.league,
    createdAt: nowIso(),
  };
}

export function buildSeasonStartEntry(season: CareerSeason): CareerTimelineEntry {
  return createTimelineEntry({
    season,
    eventType: "season_started",
    title: `Inicio da epoca ${season.season}`,
    description: `${season.coach} em ${season.club}`,
  });
}

export function buildSeasonEndEntry(season: CareerSeason): CareerTimelineEntry {
  return createTimelineEntry({
    season,
    eventType: "season_finished",
    title: `Fim da epoca ${season.season}`,
    description: `${season.club} - ${season.league}`,
  });
}

export function sortTimeline(entries: CareerTimelineEntry[]): CareerTimelineEntry[] {
  return [...entries].sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
