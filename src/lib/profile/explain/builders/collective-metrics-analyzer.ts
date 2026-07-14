import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";
import { buildRecruitmentStyleAnalysis } from "@/features/recruitment/services/recruitment-style";
import type { TeamCollectiveMetrics } from "../types";

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

export function analyzeCollectiveMetrics(players: RecruitmentPlayer[]): TeamCollectiveMetrics {
  const vectors = players.map((player) => buildRecruitmentStyleAnalysis(player).vector);

  const vector = {
    possession: clamp(avg(vectors.map((item) => item.possession))),
    buildUp: clamp(avg(vectors.map((item) => item.buildUp))),
    shortPassing: clamp(avg(vectors.map((item) => item.shortPassing))),
    longPassing: clamp(avg(vectors.map((item) => item.longPassing))),
    progression: clamp(avg(vectors.map((item) => item.progression))),
    pressing: clamp(avg(vectors.map((item) => item.pressing))),
    recovery: clamp(avg(vectors.map((item) => item.recovery))),
    counterAttack: clamp(avg(vectors.map((item) => item.counterAttack))),
    transitions: clamp(avg(vectors.map((item) => item.transitions))),
    crossing: clamp(avg(vectors.map((item) => item.crossing))),
    interiorPlay: clamp(avg(vectors.map((item) => item.interiorPlay))),
    widePlay: clamp(avg(vectors.map((item) => item.widePlay))),
    finishing: clamp(avg(vectors.map((item) => item.finishing))),
    creativity: clamp(avg(vectors.map((item) => item.creativity))),
    defensiveIntensity: clamp(avg(vectors.map((item) => item.defensiveIntensity))),
    discipline: clamp(avg(vectors.map((item) => item.discipline))),
  };

  const attack = clamp(avg([vector.finishing, vector.creativity, vector.progression, vector.crossing]));
  const defense = clamp(avg([vector.defensiveIntensity, vector.recovery, vector.discipline, vector.pressing]));
  const build = clamp(avg([vector.buildUp, vector.shortPassing, vector.longPassing, vector.progression]));
  const possession = clamp(avg([vector.possession, vector.shortPassing, vector.buildUp, vector.discipline]));
  const transitions = clamp(avg([vector.counterAttack, vector.transitions, vector.progression, vector.recovery]));
  const intensity = clamp(avg([vector.pressing, vector.defensiveIntensity, vector.transitions]));
  const creativity = clamp(avg([vector.creativity, vector.interiorPlay, vector.widePlay]));
  const physicality = clamp(avg([vector.defensiveIntensity, vector.pressing, vector.recovery]));
  const organization = clamp(avg([vector.discipline, vector.possession, vector.buildUp]));

  const volatility = std(vectors.map((item) => avg([item.buildUp, item.finishing, item.defensiveIntensity])));
  const unpredictability = clamp(volatility * 3.2);

  return {
    playerCount: players.length,
    build,
    attack,
    defense,
    possession,
    transitions,
    intensity,
    creativity,
    physicality,
    organization,
    unpredictability,
    vector,
  };
}
