import type { StyleConcept, StyleVector } from "@/lib/profile/style";

export type TacticalProfileId =
  | "gegenpress"
  | "tiki_taka"
  | "vertical_tiki_taka"
  | "wing_play"
  | "catenaccio"
  | "direct_football"
  | "route_one"
  | "fluid_counter_attack"
  | "custom";

export interface TacticalProfilePreset {
  id: TacticalProfileId;
  label: string;
  description: string;
  vector: StyleVector;
}

export const TACTICAL_STYLE_LABELS: Record<StyleConcept, string> = {
  possession: "Posse",
  buildUp: "Construção Curta",
  shortPassing: "Passe Curto",
  longPassing: "Passe Longo",
  progression: "Progressão",
  pressing: "Pressão Alta",
  recovery: "Recuperação",
  counterAttack: "Contra Ataque",
  transitions: "Transições",
  crossing: "Cruzamentos",
  interiorPlay: "Ataque Interior",
  widePlay: "Jogo Exterior",
  finishing: "Finalização",
  creativity: "Criatividade",
  defensiveIntensity: "Bloco Baixo",
  discipline: "Ritmo Controlado",
};

const base: StyleVector = {
  possession: 50,
  buildUp: 50,
  shortPassing: 50,
  longPassing: 50,
  progression: 50,
  pressing: 50,
  recovery: 50,
  counterAttack: 50,
  transitions: 50,
  crossing: 50,
  interiorPlay: 50,
  widePlay: 50,
  finishing: 50,
  creativity: 50,
  defensiveIntensity: 50,
  discipline: 50,
};

function v(patch: Partial<StyleVector>): StyleVector {
  return { ...base, ...patch };
}

export const TACTICAL_PRESET_PROFILES: TacticalProfilePreset[] = [
  {
    id: "gegenpress",
    label: "Gegenpress",
    description: "Pressão alta, transições rápidas e agressividade na recuperação.",
    vector: v({
      pressing: 92,
      transitions: 88,
      recovery: 88,
      defensiveIntensity: 82,
      counterAttack: 75,
      possession: 52,
      discipline: 58,
    }),
  },
  {
    id: "tiki_taka",
    label: "Tiki-Taka",
    description: "Domínio em posse, circulação curta e construção paciente.",
    vector: v({
      possession: 94,
      shortPassing: 92,
      buildUp: 90,
      creativity: 84,
      longPassing: 26,
      crossing: 34,
      counterAttack: 24,
    }),
  },
  {
    id: "vertical_tiki_taka",
    label: "Vertical Tiki-Taka",
    description: "Posse e passe curto com progressão vertical mais agressiva.",
    vector: v({
      possession: 84,
      shortPassing: 86,
      buildUp: 80,
      progression: 88,
      transitions: 72,
      counterAttack: 58,
    }),
  },
  {
    id: "wing_play",
    label: "Wing Play",
    description: "Exploração dos corredores e volume de cruzamentos.",
    vector: v({
      widePlay: 90,
      crossing: 92,
      progression: 74,
      finishing: 70,
      interiorPlay: 38,
      shortPassing: 46,
    }),
  },
  {
    id: "catenaccio",
    label: "Catenaccio",
    description: "Organização defensiva, bloco baixo e disciplina sem bola.",
    vector: v({
      defensiveIntensity: 90,
      discipline: 86,
      possession: 34,
      buildUp: 30,
      shortPassing: 36,
      counterAttack: 72,
      pressing: 42,
    }),
  },
  {
    id: "direct_football",
    label: "Direct Football",
    description: "Passe longo, progressão direta e finalização rápida.",
    vector: v({
      longPassing: 90,
      progression: 82,
      counterAttack: 78,
      shortPassing: 28,
      buildUp: 30,
      possession: 26,
    }),
  },
  {
    id: "route_one",
    label: "Route One",
    description: "Verticalidade máxima e jogo aéreo como via principal.",
    vector: v({
      longPassing: 94,
      crossing: 74,
      finishing: 76,
      possession: 20,
      shortPassing: 18,
      buildUp: 20,
      interiorPlay: 30,
    }),
  },
  {
    id: "fluid_counter_attack",
    label: "Fluid Counter Attack",
    description: "Bloco médio/baixo com transição fluida e dinâmica.",
    vector: v({
      counterAttack: 90,
      transitions: 88,
      progression: 80,
      pressing: 58,
      possession: 42,
      shortPassing: 44,
    }),
  },
  {
    id: "custom",
    label: "Customizado",
    description: "Modelo editável pelo utilizador.",
    vector: v({}),
  },
];

export function tacticalPresetById(id: TacticalProfileId): TacticalProfilePreset {
  return TACTICAL_PRESET_PROFILES.find((item) => item.id === id) ?? TACTICAL_PRESET_PROFILES[0];
}
