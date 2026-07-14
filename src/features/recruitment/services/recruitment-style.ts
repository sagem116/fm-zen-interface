import type {
  RecruitmentCoach,
  RecruitmentEntity,
  RecruitmentPlayer,
} from "../types/recruitment-models";
import type { StyleAnalysis, StyleConcept, StyleIndicator, StyleVector } from "@/lib/profile/style";

const STYLE_KEYS: StyleConcept[] = [
  "possession",
  "buildUp",
  "shortPassing",
  "longPassing",
  "progression",
  "pressing",
  "recovery",
  "counterAttack",
  "transitions",
  "crossing",
  "interiorPlay",
  "widePlay",
  "finishing",
  "creativity",
  "defensiveIntensity",
  "discipline",
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeMetric(value: number): number {
  if (value <= 1) return clamp(value * 100);
  if (value <= 10) return clamp(value * 10);
  if (value <= 20) return clamp(value * 5);
  if (value <= 100) return clamp(value);
  if (value <= 200) return clamp((value / 200) * 100);
  return clamp((value / 500) * 100);
}

function averageByToken(data: Record<string, number>, tokens: string[]): number | null {
  const values = Object.entries(data)
    .filter(([key]) => tokens.some((token) => key.toLowerCase().includes(token)))
    .map(([, value]) => normalizeMetric(value));
  if (!values.length) return null;
  return avg(values);
}

function traitLabels(vector: StyleVector): string[] {
  const ordered = [...STYLE_KEYS].sort((a, b) => vector[b] - vector[a]);
  return ordered.slice(0, 4).map((key) => {
    if (key === "buildUp") return "Construção forte";
    if (key === "pressing") return "Pressão agressiva";
    if (key === "finishing") return "Finalização acima da média";
    if (key === "creativity") return "Criatividade alta";
    if (key === "discipline") return "Disciplina tática";
    return `Destaque em ${key}`;
  });
}

function indicator(label: string, value: number): StyleIndicator {
  return { label, value: Math.round(clamp(value)) };
}

function similarity(a: StyleVector, b: StyleVector): number {
  const diffs = STYLE_KEYS.map((key) => Math.abs((a[key] ?? 0) - (b[key] ?? 0)));
  return Math.round(clamp(100 - avg(diffs)));
}

function entitySeason(entity: RecruitmentEntity): number {
  return (
    (entity as RecruitmentPlayer).currentSeason ??
    (entity as RecruitmentCoach).currentSeason ??
    new Date().getFullYear()
  );
}

export function buildStyleVectorForRecruitmentEntity(entity: RecruitmentEntity): StyleVector {
  const metadata = asRecord(entity.metadata);
  const attributes = asRecord(metadata.attributes);
  const metrics = asRecord(metadata.metrics);
  const stats = asRecord(metadata.statistics);

  const merged: Record<string, number> = {
    ...Object.fromEntries(
      Object.entries(attributes)
        .map(([key, value]) => [key, asNumber(value)])
        .filter((entry): entry is [string, number] => entry[1] != null),
    ),
    ...Object.fromEntries(
      Object.entries(metrics)
        .map(([key, value]) => [key, asNumber(value)])
        .filter((entry): entry is [string, number] => entry[1] != null),
    ),
    ...Object.fromEntries(
      Object.entries(stats)
        .map(([key, value]) => [key, asNumber(value)])
        .filter((entry): entry is [string, number] => entry[1] != null),
    ),
  };

  const baseline = normalizeMetric(asNumber((entity as RecruitmentPlayer).ca) ?? asNumber(entity.score) ?? 100);

  const possession = averageByToken(merged, ["passing", "first_touch", "technique", "vision", "decisions"]);
  const buildUp = averageByToken(merged, ["passing", "technique", "composure", "teamwork"]);
  const shortPassing = averageByToken(merged, ["passing", "short_pass", "first_touch"]);
  const longPassing = averageByToken(merged, ["long", "cross", "switch", "distribution"]);
  const progression = averageByToken(merged, ["dribbl", "pace", "acceleration", "off_the_ball"]);
  const pressing = averageByToken(merged, ["work_rate", "aggression", "teamwork", "stamina", "press"]);
  const recovery = averageByToken(merged, ["tackl", "marking", "position", "anticipation"]);
  const counterAttack = averageByToken(merged, ["acceleration", "pace", "finishing", "transition"]);
  const transitions = averageByToken(merged, ["work_rate", "acceleration", "decisions", "tempo"]);
  const crossing = averageByToken(merged, ["cross"]);
  const interiorPlay = averageByToken(merged, ["technique", "first_touch", "passing", "vision"]);
  const widePlay = averageByToken(merged, ["cross", "pace", "dribbl", "wide"]);
  const finishing = averageByToken(merged, ["finish", "composure", "shots", "xg", "goals"]);
  const creativity = averageByToken(merged, ["vision", "flair", "creativity", "assist", "key_pass"]);
  const defensiveIntensity = averageByToken(merged, ["aggression", "tackl", "marking", "bravery", "interception"]);
  const discipline = averageByToken(merged, ["discipline", "composure", "decisions", "concentration"]);

  return {
    possession: Math.round(possession ?? baseline),
    buildUp: Math.round(buildUp ?? baseline),
    shortPassing: Math.round(shortPassing ?? baseline),
    longPassing: Math.round(longPassing ?? baseline),
    progression: Math.round(progression ?? baseline),
    pressing: Math.round(pressing ?? baseline),
    recovery: Math.round(recovery ?? baseline),
    counterAttack: Math.round(counterAttack ?? baseline),
    transitions: Math.round(transitions ?? baseline),
    crossing: Math.round(crossing ?? baseline),
    interiorPlay: Math.round(interiorPlay ?? baseline),
    widePlay: Math.round(widePlay ?? baseline),
    finishing: Math.round(finishing ?? baseline),
    creativity: Math.round(creativity ?? baseline),
    defensiveIntensity: Math.round(defensiveIntensity ?? baseline),
    discipline: Math.round(discipline ?? baseline),
  };
}

export function buildRecruitmentStyleAnalysis(entity: RecruitmentEntity): StyleAnalysis {
  const vector = buildStyleVectorForRecruitmentEntity(entity);
  const low = [...STYLE_KEYS].sort((a, b) => vector[a] - vector[b]).slice(0, 4);

  const offensive = [
    indicator("Finalização", vector.finishing),
    indicator("Criatividade", vector.creativity),
    indicator("Progressão", vector.progression),
    indicator("Transições", vector.transitions),
    indicator("Contra-ataque", vector.counterAttack),
  ];

  const defensive = [
    indicator("Pressão", vector.pressing),
    indicator("Recuperação", vector.recovery),
    indicator("Intensidade Defensiva", vector.defensiveIntensity),
    indicator("Disciplina", vector.discipline),
  ];

  const build = [
    indicator("Passe Curto", vector.shortPassing),
    indicator("Passe Longo", vector.longPassing),
    indicator("Construção", vector.buildUp),
    indicator("Posse", vector.possession),
    indicator("Progressão", vector.progression),
  ];

  return {
    entity: entity.name,
    season: entitySeason(entity),
    sampleSize: 1,
    vector,
    strengths: traitLabels(vector),
    weaknesses: low.map((key) => `Baixa expressão em ${key}`),
    offensive,
    defensive,
    build,
    traits: traitLabels(vector),
    summary: `Perfil técnico construído a partir do Import Jogadores, com maior destaque em ${traitLabels(vector)
      .slice(0, 2)
      .join(" e ")}.`,
  };
}

export function buildRecruitmentStyleSimilarity(
  selected: RecruitmentEntity,
  pool: RecruitmentEntity[],
): Array<{ name: string; score: number }> {
  const selectedVector = buildStyleVectorForRecruitmentEntity(selected);

  return pool
    .filter((item) => item.id !== selected.id)
    .map((item) => ({
      name: item.name,
      score: similarity(selectedVector, buildStyleVectorForRecruitmentEntity(item)),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-PT"))
    .slice(0, 4);
}
