import type { PresetFn } from "../preset-utils";
import {
  OPENING_BIOGRAPHICAL_ASCENDING,
  OPENING_BIOGRAPHICAL_PEAK,
  OPENING_BIOGRAPHICAL_VETERAN,
  OPENING_BIOGRAPHICAL_EMERGING,
  TRAJECTORY_ASCENT,
  TRAJECTORY_CONSOLIDATION,
  TRAJECTORY_LEGACY,
  DRIVERS,
  POSITIONING,
  CLOSING_ELITE,
  CLOSING_NEUTRAL,
} from "../templates";

/**
 * Player preset — biographical arc.
 * Focus: trajectory, evolution, clubs, statistics, high points, status.
 */
export const playerPreset: PresetFn = ({ ctx, level, push }) => {
  const career = ctx.career;
  const phase = career?.phase ?? inferPhase(ctx);
  const opening =
    phase === "emerging"
      ? OPENING_BIOGRAPHICAL_EMERGING
      : phase === "ascending"
        ? OPENING_BIOGRAPHICAL_ASCENDING
        : phase === "veteran" || phase === "legacy"
          ? OPENING_BIOGRAPHICAL_VETERAN
          : OPENING_BIOGRAPHICAL_PEAK;
  push("opening", opening.variants, "opening");

  push("positioning", POSITIONING.variants, "positioning");
  if (level === "mini") return;

  if (career?.peakSeason && career.peakScore != null) {
    push("trajectory", TRAJECTORY_ASCENT.variants, "trajectory");
  } else if (ctx.evolution.seasonsTracked >= 5) {
    push("trajectory", TRAJECTORY_CONSOLIDATION.variants, "trajectory");
  }

  if (ctx.topContributions.length >= 2) {
    push("drivers", DRIVERS.variants, "drivers", [
      ctx.topContributions[0].id,
      ctx.topContributions[1].id,
    ]);
  }

  if (level === "standard") return;

  if (phase === "legacy") push("legacy", TRAJECTORY_LEGACY.variants, "legacy");

  push(
    "closing",
    (ctx.score.percentile >= 90 ? CLOSING_ELITE : CLOSING_NEUTRAL).variants,
    "closing",
  );
};

function inferPhase(ctx: {
  evolution: { seasonsTracked: number };
  score: { percentile: number };
  identity: { age?: number };
}): NonNullable<import("../../types").CareerContext["phase"]> {
  const s = ctx.evolution.seasonsTracked;
  const age = ctx.identity.age;
  if (age != null && age <= 21) return "emerging";
  if (age != null && age >= 33 && ctx.score.percentile >= 85) return "veteran";
  if (s <= 2) return "emerging";
  if (s <= 5) return "ascending";
  if (s >= 10 && ctx.score.percentile >= 90) return "legacy";
  return "peak";
}
