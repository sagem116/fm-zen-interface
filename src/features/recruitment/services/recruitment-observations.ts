import type { RecruitmentObservationsService } from "../types/recruitment-service-types";
import { useSyncExternalStore } from "react";
import type {
  RecruitmentEntityKind,
  ScoutObservation,
  ScoutObservationType,
  ScoutPriority,
  ScoutReportStatus,
} from "../types/recruitment-models";

const STORAGE_KEY = "fm-recruitment-observations-v1";

export interface ObservationInput {
  entityId: string;
  entityKind: RecruitmentEntityKind;
  title: string;
  description: string;
  date?: string;
  season?: number | null;
  competition?: string | null;
  club?: string | null;
  author?: string | null;
  priority?: ScoutPriority;
  status?: ScoutReportStatus;
  tags?: string[];
  type?: ScoutObservationType;
  favorite?: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function read(): ScoutObservation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoutObservation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function write(next: ScoutObservation[]) {
  if (typeof window === "undefined") return;
  cache = next.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = read();
    emit();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function list() {
  return cache;
}

export function createObservation(input: ObservationInput): ScoutObservation {
  const item: ScoutObservation = {
    id: `obs.${Math.random().toString(36).slice(2, 10)}`,
    entityId: input.entityId,
    entityKind: input.entityKind,
    title: input.title,
    summary: input.description,
    description: input.description,
    type: input.type ?? "observation",
    season: input.season ?? null,
    competition: input.competition ?? null,
    club: input.club ?? null,
    author: input.author ?? null,
    priority: input.priority ?? "medium",
    status: input.status ?? "watching",
    tags: input.tags ?? [],
    favorite: Boolean(input.favorite),
    attachments: [],
    createdAt: input.date || nowIso(),
    updatedAt: nowIso(),
  };
  write([item, ...cache]);
  return item;
}

export function updateObservation(id: string, patch: Partial<ObservationInput>) {
  write(
    cache.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        title: patch.title ?? item.title,
        summary: patch.description ?? item.summary,
        description: patch.description ?? item.description,
        season: patch.season ?? item.season,
        competition: patch.competition ?? item.competition,
        club: patch.club ?? item.club,
        author: patch.author ?? item.author,
        priority: patch.priority ?? item.priority,
        status: patch.status ?? item.status,
        tags: patch.tags ?? item.tags,
        type: patch.type ?? item.type,
        favorite: patch.favorite ?? item.favorite,
        updatedAt: nowIso(),
      };
    }),
  );
}

export function removeObservation(id: string) {
  write(cache.filter((item) => item.id !== id));
}

export function useRecruitmentObservationEntries() {
  return useSyncExternalStore(subscribe, list, list);
}

export const recruitmentObservationsService: Partial<RecruitmentObservationsService> = {
  async listObservations() {
    return list();
  },
};
