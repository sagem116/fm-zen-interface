import type { StyleConcept, StyleVector } from "@/lib/profile/style";

export interface TacticalDimensionScores {
  global: number;
  offensive: number;
  defensive: number;
  physical: number;
  technical: number;
  mental: number;
}

export interface TacticalRadarItem {
  axis: string;
  score: number;
}

export interface PositionalCompatibility {
  position: string;
  score: number;
  stars: number;
}

export interface TacticalStyleIndicator {
  label: string;
  value: number;
}

export interface TeamStyleSummary {
  bars: TacticalStyleIndicator[];
  summary: string;
}

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

const POSITION_FOCUS: Record<string, Partial<Record<StyleConcept, number>>> = {
  GK: { longPassing: 0.35, discipline: 0.25, buildUp: 0.2, possession: 0.2 },
  DR: { pressing: 0.2, recovery: 0.2, discipline: 0.2, widePlay: 0.2, crossing: 0.2 },
  DL: { pressing: 0.2, recovery: 0.2, discipline: 0.2, widePlay: 0.2, crossing: 0.2 },
  DCR: { defensiveIntensity: 0.35, recovery: 0.3, discipline: 0.25, longPassing: 0.1 },
  DCL: { defensiveIntensity: 0.35, recovery: 0.3, discipline: 0.25, longPassing: 0.1 },
  DC: { defensiveIntensity: 0.35, recovery: 0.3, discipline: 0.25, longPassing: 0.1 },
  WBR: { pressing: 0.2, crossing: 0.25, progression: 0.2, widePlay: 0.2, recovery: 0.15 },
  WBL: { pressing: 0.2, crossing: 0.25, progression: 0.2, widePlay: 0.2, recovery: 0.15 },
  DM: { buildUp: 0.25, possession: 0.2, recovery: 0.2, discipline: 0.2, shortPassing: 0.15 },
  MC: { possession: 0.2, buildUp: 0.2, shortPassing: 0.2, progression: 0.2, creativity: 0.2 },
  AM: {
    creativity: 0.3,
    progression: 0.25,
    finishing: 0.15,
    shortPassing: 0.15,
    transitions: 0.15,
  },
  MR: { widePlay: 0.3, crossing: 0.25, progression: 0.2, transitions: 0.15, pressing: 0.1 },
  ML: { widePlay: 0.3, crossing: 0.25, progression: 0.2, transitions: 0.15, pressing: 0.1 },
  ST: { finishing: 0.35, progression: 0.2, pressing: 0.15, transitions: 0.15, counterAttack: 0.15 },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function styleFit(vector: StyleVector, target: StyleVector): number {
  const values = STYLE_KEYS.map((key) => 100 - Math.abs((vector[key] ?? 0) - (target[key] ?? 0)));
  return Math.round(avg(values));
}

function scoreBlend(
  current: number | null | undefined,
  potential: number | null | undefined,
): number {
  const cur = Number.isFinite(current) ? Number(current) : 0;
  const pot = Number.isFinite(potential) ? Number(potential) : cur;
  return clamp(((cur * 0.65 + pot * 0.35) / 200) * 100);
}

function ageFit(age: number | null | undefined): number {
  if (!Number.isFinite(age)) return 50;
  const a = Number(age);
  if (a <= 19) return 66;
  if (a <= 23) return 84;
  if (a <= 29) return 94;
  if (a <= 33) return 78;
  return 60;
}

export function buildCompatibilityScores(input: {
  vector: StyleVector;
  philosophy: StyleVector;
  currentScore?: number | null;
  potentialScore?: number | null;
  age?: number | null;
}): TacticalDimensionScores {
  const match = styleFit(input.vector, input.philosophy);
  const offensive = Math.round(
    avg([
      input.vector.finishing,
      input.vector.creativity,
      input.vector.progression,
      input.vector.counterAttack,
      input.vector.transitions,
    ]),
  );
  const defensive = Math.round(
    avg([
      input.vector.pressing,
      input.vector.recovery,
      input.vector.defensiveIntensity,
      input.vector.discipline,
    ]),
  );
  const physical = Math.round(
    avg([
      input.vector.transitions,
      input.vector.pressing,
      input.vector.recovery,
      input.vector.progression,
    ]),
  );
  const technical = Math.round(
    avg([
      input.vector.shortPassing,
      input.vector.longPassing,
      input.vector.buildUp,
      input.vector.crossing,
      input.vector.creativity,
    ]),
  );
  const mental = Math.round(
    avg([
      input.vector.discipline,
      input.vector.possession,
      input.vector.defensiveIntensity,
      input.vector.creativity,
    ]),
  );

  const blended = scoreBlend(input.currentScore, input.potentialScore);
  const age = ageFit(input.age);

  const global = Math.round(match * 0.55 + blended * 0.25 + age * 0.2);

  return {
    global: clamp(global),
    offensive: clamp(offensive),
    defensive: clamp(defensive),
    physical: clamp(physical),
    technical: clamp(technical),
    mental: clamp(mental),
  };
}

export function buildCompatibilityRadar(vector: StyleVector): TacticalRadarItem[] {
  return [
    {
      axis: "Técnica",
      score: Math.round(avg([vector.shortPassing, vector.buildUp, vector.crossing])),
    },
    { axis: "Criatividade", score: vector.creativity },
    {
      axis: "Intensidade",
      score: Math.round(avg([vector.pressing, vector.transitions, vector.defensiveIntensity])),
    },
    {
      axis: "Mobilidade",
      score: Math.round(avg([vector.progression, vector.counterAttack, vector.recovery])),
    },
    { axis: "Construção", score: vector.buildUp },
    { axis: "Pressão", score: vector.pressing },
    { axis: "Finalização", score: vector.finishing },
    {
      axis: "Jogo Aéreo",
      score: Math.round(avg([vector.longPassing, vector.widePlay, vector.finishing])),
    },
  ];
}

export function buildPositionalCompatibility(
  positionRaw: string | null | undefined,
  vector: StyleVector,
): PositionalCompatibility[] {
  if (!positionRaw) return [];
  const tokens = positionRaw
    .split(/[\s,;/|]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const unique = [...new Set(tokens)];
  const out: PositionalCompatibility[] = [];

  for (const token of unique) {
    const focus = POSITION_FOCUS[token];
    if (!focus) continue;
    const parts = Object.entries(focus) as Array<[StyleConcept, number]>;
    const weighted = parts.reduce((sum, [key, weight]) => sum + (vector[key] ?? 0) * weight, 0);
    const score = Math.round(clamp(weighted));
    out.push({
      position: token,
      score,
      stars: Math.max(1, Math.min(5, Math.round(score / 20))),
    });
  }

  return out.sort((a, b) => b.score - a.score || a.position.localeCompare(b.position));
}

export function buildStrengths(vector: StyleVector): string[] {
  const pool: Array<{ label: string; value: number }> = [
    { label: "Excelente pressão", value: vector.pressing },
    { label: "Muito forte em construção", value: vector.buildUp },
    {
      label: "Grande capacidade de passe",
      value: Math.round(avg([vector.shortPassing, vector.longPassing])),
    },
    { label: "Excelente progressão", value: vector.progression },
    { label: "Criatividade diferenciadora", value: vector.creativity },
    {
      label: "Alta intensidade competitiva",
      value: Math.round(avg([vector.transitions, vector.defensiveIntensity])),
    },
    { label: "Boa recuperação defensiva", value: vector.recovery },
    { label: "Finalização consistente", value: vector.finishing },
  ];
  return pool
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map((item) => item.label);
}

export function buildWeaknesses(vector: StyleVector): string[] {
  const pool: Array<{ label: string; value: number }> = [
    { label: "Pouco jogo aéreo", value: Math.round(avg([vector.longPassing, vector.widePlay])) },
    { label: "Baixa agressividade", value: vector.pressing },
    {
      label: "Pouca mobilidade",
      value: Math.round(avg([vector.progression, vector.counterAttack])),
    },
    { label: "Fraco no um para um", value: vector.creativity },
    { label: "Baixa presença ofensiva", value: vector.finishing },
    { label: "Construção limitada", value: vector.buildUp },
    { label: "Défice de disciplina tática", value: vector.discipline },
    { label: "Transição defensiva curta", value: vector.recovery },
  ];
  return pool
    .sort((a, b) => a.value - b.value)
    .slice(0, 4)
    .map((item) => item.label);
}

export function buildStyleIndicators(vector: StyleVector): TacticalStyleIndicator[] {
  const indicators: TacticalStyleIndicator[] = [
    { label: "Construtor", value: Math.round(avg([vector.buildUp, vector.shortPassing])) },
    { label: "Finalizador", value: vector.finishing },
    { label: "Criador", value: vector.creativity },
    { label: "Pressionante", value: vector.pressing },
    { label: "Distribuidor", value: Math.round(avg([vector.shortPassing, vector.longPassing])) },
    { label: "Organizador", value: Math.round(avg([vector.possession, vector.discipline])) },
    { label: "Desequilibrador", value: Math.round(avg([vector.progression, vector.transitions])) },
    { label: "Recuperador", value: vector.recovery },
    { label: "Transportador", value: Math.round(avg([vector.progression, vector.counterAttack])) },
    {
      label: "Especialista em bolas paradas",
      value: Math.round(avg([vector.crossing, vector.longPassing])),
    },
  ];
  return indicators.sort((a, b) => b.value - a.value);
}

export function buildTeamStyleSummary(vectors: StyleVector[]): TeamStyleSummary {
  if (!vectors.length) {
    return {
      bars: [],
      summary: "Sem amostra para estimar o estilo coletivo.",
    };
  }

  const mean = (key: StyleConcept) => Math.round(avg(vectors.map((vector) => vector[key] ?? 0)));

  const bars: TacticalStyleIndicator[] = [
    { label: "Posse", value: mean("possession") },
    { label: "Construção", value: mean("buildUp") },
    { label: "Passe Longo", value: mean("longPassing") },
    { label: "Contra Ataque", value: mean("counterAttack") },
    { label: "Pressão", value: mean("pressing") },
  ];

  const strongest = [...bars]
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());
  const weakest = [...bars]
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());

  return {
    bars,
    summary: `Modelo coletivo com foco em ${strongest.join(" e ")}. Menor expressão em ${weakest.join(" e ")}.`,
  };
}
