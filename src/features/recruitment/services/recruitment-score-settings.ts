import { useSyncExternalStore } from "react";
import type {
  RecruitmentScorePreset,
  RecruitmentScoreSettingsState,
} from "../types/recruitment-models";

const STORAGE_KEY = "fm-recruitment-score-settings-v1";

function makePreset(
  id: string,
  name: string,
  description: string,
  overrides?: Partial<RecruitmentScorePreset>,
): RecruitmentScorePreset {
  return {
    id,
    name,
    description,
    entityKinds: ["player", "coach"],
    scoreSelectionMode: "all",
    selectedScoreIds: [],
    criteria: {
      ranking: { enabled: true, weight: 18 },
      scores: { enabled: true, weight: 16 },
      tacticalCompatibility: { enabled: true, weight: 24 },
      psychological: { enabled: true, weight: 9 },
      potential: { enabled: true, weight: 15 },
      age: { enabled: true, weight: 6 },
      value: { enabled: true, weight: 12 },
      salary: { enabled: true, weight: 8 },
      form: { enabled: true, weight: 8 },
      consistency: { enabled: true, weight: 6 },
      versatility: { enabled: true, weight: 6 },
      style: { enabled: true, weight: 7 },
      risk: { enabled: true, weight: 5 },
      intelligence: { enabled: true, weight: 8 },
      history: { enabled: true, weight: 4 },
    },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function defaults(): RecruitmentScoreSettingsState {
  const presets = [
    makePreset("wonderkids", "Wonderkids", "Foco em potencial, estilo e crescimento.", {
      criteria: {
        ranking: { enabled: true, weight: 10 },
        scores: { enabled: true, weight: 10 },
        tacticalCompatibility: { enabled: true, weight: 16 },
        psychological: { enabled: true, weight: 8 },
        potential: { enabled: true, weight: 26 },
        age: { enabled: true, weight: 12 },
        value: { enabled: true, weight: 7 },
        salary: { enabled: true, weight: 5 },
        form: { enabled: true, weight: 5 },
        consistency: { enabled: true, weight: 5 },
        versatility: { enabled: true, weight: 8 },
        style: { enabled: true, weight: 8 },
        risk: { enabled: true, weight: 8 },
        intelligence: { enabled: true, weight: 10 },
        history: { enabled: true, weight: 2 },
      },
    }),
    makePreset("mercado", "Mercado", "Foco em custo-beneficio e risco financeiro.", {
      criteria: {
        ranking: { enabled: true, weight: 10 },
        scores: { enabled: true, weight: 14 },
        tacticalCompatibility: { enabled: true, weight: 18 },
        psychological: { enabled: true, weight: 8 },
        potential: { enabled: true, weight: 10 },
        age: { enabled: true, weight: 6 },
        value: { enabled: true, weight: 22 },
        salary: { enabled: true, weight: 16 },
        form: { enabled: true, weight: 7 },
        consistency: { enabled: true, weight: 5 },
        versatility: { enabled: true, weight: 4 },
        style: { enabled: true, weight: 4 },
        risk: { enabled: true, weight: 10 },
        intelligence: { enabled: true, weight: 6 },
        history: { enabled: true, weight: 4 },
      },
    }),
    makePreset("jogadores-prontos", "Jogadores Prontos", "Foco em impacto imediato e forma atual."),
    makePreset("baixo-custo", "Baixo Custo", "Prioriza valor e salario."),
    makePreset("elite", "Elite", "Prioriza ranking, scores e compatibilidade de topo."),
    makePreset(
      "longo-prazo",
      "Longo Prazo",
      "Prioriza potencial, inteligencia e risco controlado.",
    ),
    makePreset("personalizado", "Personalizado", "Preset editavel para cenarios personalizados."),
  ];

  return {
    activePresetId: presets[0].id,
    presets,
    updatedAt: new Date().toISOString(),
  };
}

function read(): RecruitmentScoreSettingsState {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as RecruitmentScoreSettingsState;
    if (!parsed || !Array.isArray(parsed.presets) || !parsed.presets.length) return defaults();
    return parsed;
  } catch {
    return defaults();
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function write(next: RecruitmentScoreSettingsState) {
  cache = {
    ...next,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
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

function snapshot() {
  return cache;
}

function makeCopyId(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useRecruitmentScoreSettingsState() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function setActiveRecruitmentScorePreset(id: string) {
  if (!cache.presets.some((preset) => preset.id === id)) return;
  write({ ...cache, activePresetId: id });
}

export function upsertRecruitmentScorePreset(preset: RecruitmentScorePreset) {
  const exists = cache.presets.some((item) => item.id === preset.id);
  const nextPreset = { ...preset, updatedAt: new Date().toISOString() };
  const presets = exists
    ? cache.presets.map((item) => (item.id === preset.id ? nextPreset : item))
    : [...cache.presets, nextPreset];
  write({ ...cache, presets, activePresetId: nextPreset.id });
}

export function duplicateRecruitmentScorePreset(id: string) {
  const source = cache.presets.find((item) => item.id === id);
  if (!source) return;
  const duplicate: RecruitmentScorePreset = {
    ...source,
    id: makeCopyId(source.id),
    name: `${source.name} (Copia)`,
    updatedAt: new Date().toISOString(),
  };
  write({ ...cache, presets: [...cache.presets, duplicate], activePresetId: duplicate.id });
}

export function importRecruitmentScorePresets(payload: string) {
  const parsed = JSON.parse(payload) as
    RecruitmentScorePreset[] | { presets?: RecruitmentScorePreset[] };
  const incoming = Array.isArray(parsed) ? parsed : (parsed.presets ?? []);
  if (!Array.isArray(incoming) || !incoming.length) return;
  const normalized = incoming.map((item) => ({ ...item, updatedAt: new Date().toISOString() }));
  write({ ...cache, presets: normalized, activePresetId: normalized[0].id });
}

export function exportRecruitmentScorePresetsJSON() {
  return JSON.stringify({ presets: cache.presets, activePresetId: cache.activePresetId }, null, 2);
}

export function restoreRecruitmentScoreDefaults() {
  write(defaults());
}
