import type { RecruitmentReportsService } from "../types/recruitment-service-types";
import { useSyncExternalStore } from "react";
import type {
  RecruitmentEntityKind,
  ScoutPriority,
  ScoutReport,
  ScoutReportStatus,
} from "../types/recruitment-models";

const STORAGE_KEY = "fm-recruitment-scout-reports-v1";

export interface ScoutReportDraft {
  title: string;
  targetId: string;
  entityKind: RecruitmentEntityKind;
  entityName: string;
  status: ScoutReportStatus;
  priority: ScoutPriority;
  summary?: string;
  notes?: string;
  tags?: string[];
  author?: string | null;
}

function nowIso() {
  return new Date().toISOString();
}

function read(): ScoutReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoutReport[];
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

function write(next: ScoutReport[]) {
  if (typeof window === "undefined") return;
  cache = next.sort((a, b) => {
    const da = new Date(a.updatedAt ?? a.createdAt).getTime();
    const db = new Date(b.updatedAt ?? b.createdAt).getTime();
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

function timelineEntry(message: string, author?: string | null) {
  return {
    id: `timeline.${Math.random().toString(36).slice(2, 10)}`,
    at: nowIso(),
    message,
    author: author ?? null,
  };
}

export function upsertScoutReport(draft: ScoutReportDraft): ScoutReport {
  const existing = cache.find(
    (item) => item.targetId === draft.targetId && item.entityKind === draft.entityKind,
  );

  if (existing) {
    const updated: ScoutReport = {
      ...existing,
      title: draft.title,
      summary: draft.summary ?? existing.summary,
      notes: draft.notes ?? existing.notes,
      status: draft.status,
      priority: draft.priority,
      tags: draft.tags ?? existing.tags ?? [],
      updatedBy: draft.author ?? existing.updatedBy ?? null,
      updatedAt: nowIso(),
      timeline: [
        timelineEntry("Atualizado relatório.", draft.author),
        ...(existing.timeline ?? []),
      ],
    };
    write(cache.map((item) => (item.id === existing.id ? updated : item)));
    return updated;
  }

  const created: ScoutReport = {
    id: `report.${Math.random().toString(36).slice(2, 10)}`,
    title: draft.title,
    targetId: draft.targetId,
    entityKind: draft.entityKind,
    entityName: draft.entityName,
    status: draft.status,
    priority: draft.priority,
    tags: draft.tags ?? [],
    summary: draft.summary,
    notes: draft.notes,
    updatedBy: draft.author ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: [timelineEntry("Criado relatório.", draft.author)],
  };
  write([created, ...cache]);
  return created;
}

export function updateScoutReportStatus(
  id: string,
  status: ScoutReportStatus,
  author?: string | null,
) {
  write(
    cache.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        status,
        updatedAt: nowIso(),
        updatedBy: author ?? item.updatedBy ?? null,
        timeline: [
          timelineEntry(`Alterado estado para ${status}.`, author),
          ...(item.timeline ?? []),
        ],
      };
    }),
  );
}

export function useRecruitmentScoutReports() {
  return useSyncExternalStore(subscribe, list, list);
}

export const recruitmentReportsService: Partial<RecruitmentReportsService> = {
  async listReports() {
    return list();
  },
};
