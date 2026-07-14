import type { CanonicalScore } from "./types";

export const canonicalExamples: Record<string, CanonicalScore> = {
  player: {
    name: "Clinical Finisher",
    entity: "player",
    category: "Attacker",
    description: "Elite finishing profile combining raw attributes and output metrics.",
    attributes: [
      { name: "Finishing", weight: 15 },
      { name: "Composure", weight: 12 },
      { name: "Off the Ball", weight: 10 },
    ],
    metrics: [
      { name: "Goals/90", weight: 25 },
      { name: "xG per 90", weight: 20 },
    ],
  },
  club: {
    name: "Elite Attack",
    entity: "club",
    category: "Attack",
    description: "Club-level attacking output.",
    metrics: [
      { name: "xG per 90", weight: 30 },
    ],
  },
  coach: {
    name: "Winning Manager",
    entity: "coach",
    category: "Results",
    description: "Coach effectiveness profile.",
    attributes: [],
    metrics: [],
  },
  competition: {
    name: "Top Competition",
    entity: "competition",
    category: "Prestige",
    description: "Prestige and quality index of a competition.",
  },
  country: {
    name: "Football Nation",
    entity: "country",
    category: "Global",
    description: "Country-level football strength.",
  },
};
