import type { PresetFn } from "../preset-utils";
import {
  OPENING_COACH_TRANSFORMER,
  OPENING_COACH_ESTABLISHED,
  OPENING_COACH_EMERGING,
  POSITIONING,
  CLOSING_ELITE,
  CLOSING_NEUTRAL,
} from "../templates";

/**
 * Coach preset — career.
 * Focus: clubs, cycles, projects, legacy.
 */
export const coachPreset: PresetFn = ({ ctx, level, push }) => {
  const seasons = ctx.career?.seasons ?? ctx.evolution.seasonsTracked;
  const titles = ctx.career?.titles ?? 0;
  const opening =
    titles >= 3 || seasons >= 10
      ? OPENING_COACH_TRANSFORMER
      : seasons >= 4
        ? OPENING_COACH_ESTABLISHED
        : OPENING_COACH_EMERGING;
  push("opening", opening.variants, "opening");

  push("positioning", POSITIONING.variants, "positioning");
  if (level === "mini") return;

  if (level === "standard") return;
  push(
    "closing",
    (ctx.score.percentile >= 85 ? CLOSING_ELITE : CLOSING_NEUTRAL).variants,
    "closing",
  );
};
