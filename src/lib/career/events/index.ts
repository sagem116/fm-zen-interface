export type CareerEventName =
  | "SeasonCreated"
  | "SeasonUpdated"
  | "SeasonDeleted"
  | "AchievementAdded"
  | "AchievementUpdated"
  | "GalleryUpdated"
  | "JournalUpdated"
  | "TrophyAdded"
  | "TrophyUpdated"
  | "CareerChanged";

export interface CareerEventPayload {
  careerId?: `career.${string}`;
  seasonId?: `career_season.${string}`;
  entityId?: string;
  meta?: Record<string, unknown>;
}

export interface CareerEvent {
  name: CareerEventName;
  payload?: CareerEventPayload;
  createdAt: string;
}

type EventHandler = (event: CareerEvent) => void;

const handlers = new Set<EventHandler>();

export function emitCareerEvent(name: CareerEventName, payload?: CareerEventPayload): void {
  const event: CareerEvent = {
    name,
    payload,
    createdAt: new Date().toISOString(),
  };
  for (const handler of handlers) handler(event);
}

export function onCareerEvent(handler: EventHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
