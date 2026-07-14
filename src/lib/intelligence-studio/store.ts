/**
 * Intelligence Studio — persistent store (localStorage).
 * Zero coupling with the Intelligence Engine internals.
 */
import { useSyncExternalStore } from "react";
import type { StudioProfile, StudioSettings, StudioExport } from "./types";

const PROFILES_KEY = "intel_studio_profiles_v1";
const SETTINGS_KEY = "intel_studio_settings_v1";

const DEFAULT_BUILTIN_ID = "studio.profile.default";

function nowISO() {
  return new Date().toISOString();
}

export function emptyProfile(id: string, name: string): StudioProfile {
  const ts = nowISO();
  return {
    id,
    name,
    description: "",
    version: "1.0.0",
    createdAt: ts,
    updatedAt: ts,
    author: undefined,
    changeLog: [{ at: ts, summary: "Perfil criado" }],
    upsertRules: [],
    upsertTraits: [],
    upsertProfiles: [],
    upsertNarratives: [],
    removedRuleIds: [],
    removedTraitIds: [],
    removedProfileIds: [],
    removedNarrativeTraitIds: [],
  };
}

function defaultProfiles(): StudioProfile[] {
  return [
    {
      ...emptyProfile(DEFAULT_BUILTIN_ID, "Padrão"),
      description: "Configuração padrão do Intelligence Engine (sem overrides).",
    },
  ];
}

function defaultSettings(): StudioSettings {
  return {
    activeProfileId: DEFAULT_BUILTIN_ID,
    showEvidence: true,
    showConfidence: true,
    showPercentiles: true,
    showMetrics: true,
    onlyStrong: false,
    groupByCategory: true,
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const p = JSON.parse(raw);
    return (p ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// ---------- Read ----------

export function loadProfiles(): StudioProfile[] {
  if (typeof window === "undefined") return defaultProfiles();
  const list = safeParse<StudioProfile[]>(localStorage.getItem(PROFILES_KEY), []);
  if (!list.length) return defaultProfiles();
  if (!list.some((p) => p.id === DEFAULT_BUILTIN_ID)) return [...defaultProfiles(), ...list];
  return list;
}

export function loadSettings(): StudioSettings {
  if (typeof window === "undefined") return defaultSettings();
  const s = safeParse<Partial<StudioSettings> | null>(localStorage.getItem(SETTINGS_KEY), null);
  return { ...defaultSettings(), ...(s ?? {}) };
}

// ---------- Write ----------

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  cachedProfiles = null;
  cachedSettings = null;
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Cached snapshots — required for useSyncExternalStore stability. Without
// this, each call returns a new object reference and React re-renders
// infinitely ("Maximum update depth exceeded").
let cachedProfiles: StudioProfile[] | null = null;
let cachedSettings: StudioSettings | null = null;

function getProfilesSnapshot(): StudioProfile[] {
  if (cachedProfiles === null) cachedProfiles = loadProfiles();
  return cachedProfiles;
}
function getSettingsSnapshot(): StudioSettings {
  if (cachedSettings === null) cachedSettings = loadSettings();
  return cachedSettings;
}

export function saveProfiles(profiles: StudioProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  emit();
}

export function saveSettings(settings: StudioSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  emit();
}

// ---------- CRUD helpers ----------

export function upsertProfile(p: StudioProfile): void {
  const list = loadProfiles();
  const idx = list.findIndex((x) => x.id === p.id);
  const next = { ...p, updatedAt: nowISO() };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveProfiles(list);
}

export function deleteProfile(id: string): void {
  if (id === DEFAULT_BUILTIN_ID) return;
  const list = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(list);
  const s = loadSettings();
  if (s.activeProfileId === id) saveSettings({ ...s, activeProfileId: DEFAULT_BUILTIN_ID });
}

export function duplicateProfile(id: string): StudioProfile | null {
  const src = loadProfiles().find((p) => p.id === id);
  if (!src) return null;
  const copy: StudioProfile = {
    ...JSON.parse(JSON.stringify(src)),
    id: `studio.profile.${Date.now()}`,
    name: `${src.name} (cópia)`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    changeLog: [...src.changeLog, { at: nowISO(), summary: `Duplicado de ${src.name}` }],
  };
  upsertProfile(copy);
  return copy;
}

export function setActiveProfile(id: string): void {
  const s = loadSettings();
  saveSettings({ ...s, activeProfileId: id });
}

export function exportAll(): StudioExport {
  return {
    kind: "intelligence-studio-export",
    version: 1,
    exportedAt: nowISO(),
    settings: loadSettings(),
    profiles: loadProfiles(),
  };
}

export function importAll(payload: unknown): { ok: boolean; error?: string } {
  if (!payload || typeof payload !== "object") return { ok: false, error: "Payload inválido" };
  const p = payload as Partial<StudioExport>;
  if (p.kind !== "intelligence-studio-export") return { ok: false, error: "Formato desconhecido" };
  if (!Array.isArray(p.profiles)) return { ok: false, error: "Perfis em falta" };
  saveProfiles(p.profiles);
  if (p.settings) saveSettings(p.settings);
  return { ok: true };
}

export function appendChange(id: string, summary: string): void {
  const list = loadProfiles();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  p.changeLog = [...p.changeLog, { at: nowISO(), summary }].slice(-50);
  p.updatedAt = nowISO();
  saveProfiles(list);
}

// ---------- React bindings ----------

export function useStudioProfiles(): StudioProfile[] {
  return useSyncExternalStore(subscribe, getProfilesSnapshot, getProfilesSnapshot);
}
export function useStudioSettings(): StudioSettings {
  return useSyncExternalStore(subscribe, getSettingsSnapshot, getSettingsSnapshot);
}

export { DEFAULT_BUILTIN_ID };
