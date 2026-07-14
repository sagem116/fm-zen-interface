import type { PresetFn } from "../preset-utils";
import {
  OPENING_STRONG,
  OPENING_STABLE,
  OPENING_DECLINE,
  POSITIONING,
  DRIVERS,
  EVOLUTION_UP,
  EVOLUTION_DOWN,
  EVOLUTION_FLAT,
  CONTEXT_BEST_WORLD,
  CONTEXT_BEST_CONTINENT,
  CONTEXT_BEST_COUNTRY,
  CONTEXT_BEST_COMPETITION,
  CONTEXT_BEST_CLUB,
  CLOSING_ELITE,
  CLOSING_NEUTRAL,
} from "../templates";

/**
 * Rankings preset — answers "Quem está melhor neste momento?"
 * Focus: current position, evolution, rise/fall, competitive dominance.
 */
export const rankingsPreset: PresetFn = ({ ctx, level, push }) => {
  const dr = ctx.evolution.deltaRank;

  // opening
  const opening =
    ctx.score.percentile >= 95 && (dr == null || dr <= 0)
      ? OPENING_STRONG
      : dr != null && dr >= 3
        ? OPENING_DECLINE
        : OPENING_STABLE;
  push("opening", opening.variants, "opening");

  push("positioning", POSITIONING.variants, "positioning");

  if (level === "mini") return;

  if (ctx.topContributions.length >= 2) {
    push("drivers", DRIVERS.variants, "drivers", [
      ctx.topContributions[0].id,
      ctx.topContributions[1].id,
    ]);
  }

  const contextBlock = ctx.insights.some((i) => i.kind === "best-of-world")
    ? CONTEXT_BEST_WORLD
    : ctx.insights.some((i) => i.kind === "best-of-continent")
      ? CONTEXT_BEST_CONTINENT
      : ctx.insights.some((i) => i.kind === "best-of-country")
        ? CONTEXT_BEST_COUNTRY
        : ctx.insights.some((i) => i.kind === "best-of-competition")
          ? CONTEXT_BEST_COMPETITION
          : ctx.insights.some((i) => i.kind === "best-of-club")
            ? CONTEXT_BEST_CLUB
            : null;
  if (contextBlock) push("context", contextBlock.variants, "context");

  if (level === "standard") return;

  const evo =
    dr == null ? null : dr <= -2 ? EVOLUTION_UP : dr >= 2 ? EVOLUTION_DOWN : EVOLUTION_FLAT;
  if (evo) push("evolution", evo.variants, "evolution");

  push(
    "closing",
    (ctx.score.percentile >= 90 ? CLOSING_ELITE : CLOSING_NEUTRAL).variants,
    "closing",
  );
};
