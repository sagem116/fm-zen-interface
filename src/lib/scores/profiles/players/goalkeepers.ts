import type { AttributeId, ContextId, MetricId, ModifierId, ScoreDefinition } from "../../types";

const ar = (attributeId: AttributeId, weight: number) => ({ attributeId, weight });
const mr = (metricId: MetricId, weight: number) => ({ metricId, weight });
const cr = (contextId: ContextId, weight: number) => ({ contextId, weight });
const mor = (modifierId: ModifierId, weight: number) => ({ modifierId, weight });

export const goalkeeperScores: ScoreDefinition[] = [
  {
    id: "score.goalkeeper",
    name: "Goalkeeper",
    entityKind: "player",
    categoryId: "score_category.player_goalkeeper",
    description: "Traditional goalkeeper profile focused on shot prevention and area control.",
    attributeRefs: [
      ar("attribute.command_of_area", 1.4),
      ar("attribute.positioning", 1.2),
      ar("attribute.decisions", 1.1),
      ar("attribute.vision", 0.8),
      ar("attribute.stamina", 0.7),
    ],
    metricRefs: [
      mr("metric.clean_sheets_pct", 1.4),
      mr("metric.duel_win_pct", 1.1),
      mr("metric.pass_completion_pct", 0.9),
      mr("metric.minutes_played", 0.8),
      mr("metric.points_per_match", 0.8),
    ],
    contextRefs: [
      cr("context.minutes", 1.2),
      cr("context.league_strength", 1),
      cr("context.team_strength", 0.8),
    ],
    modifierRefs: [
      mor("modifier.low_minutes", 1.2),
      mor("modifier.consistency", 1),
      mor("modifier.big_matches", 0.8),
    ],
    status: "active",
    version: "1.0.0",
    tags: ["player", "goalkeeper"],
    metadata: {
      source: "score-library.phase-1.4",
      discoverable: true,
    },
  },
  {
    id: "score.sweeper_keeper",
    name: "Sweeper Keeper",
    entityKind: "player",
    categoryId: "score_category.player_goalkeeper",
    description: "Goalkeeper profile with stronger emphasis on build-up and proactive positioning.",
    attributeRefs: [
      ar("attribute.command_of_area", 1.2),
      ar("attribute.passing", 1.1),
      ar("attribute.first_touch", 1.1),
      ar("attribute.decisions", 1),
      ar("attribute.acceleration", 0.8),
    ],
    metricRefs: [
      mr("metric.pass_completion_pct", 1.2),
      mr("metric.key_passes_per90", 1),
      mr("metric.clean_sheets_pct", 1),
      mr("metric.minutes_played", 0.9),
      mr("metric.points_per_match", 0.7),
    ],
    contextRefs: [
      cr("context.minutes", 1.1),
      cr("context.league_strength", 1),
      cr("context.team_strength", 0.9),
    ],
    modifierRefs: [
      mor("modifier.low_minutes", 1.2),
      mor("modifier.versatility", 1),
      mor("modifier.consistency", 0.9),
    ],
    status: "active",
    version: "1.0.0",
    tags: ["player", "goalkeeper", "sweeper"],
    metadata: {
      source: "score-library.phase-1.4",
      discoverable: true,
    },
  },
];
