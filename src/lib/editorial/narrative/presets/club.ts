import type { PresetFn } from "../preset-utils";
import {
  OPENING_INSTITUTIONAL_RISING,
  OPENING_INSTITUTIONAL_DOMINANT,
  OPENING_INSTITUTIONAL_DECLINE,
  OPENING_INSTITUTIONAL_STABLE,
  CLUB_CYCLE_TITLES,
  CLUB_CYCLE_CONSISTENCY,
  POSITIONING,
  CLOSING_ELITE,
  CLOSING_NEUTRAL,
} from "../templates";

/**
 * Club preset — institutional cycles.
 * Focus: cycles, dominant eras, growth, titles, competitive identity.
 */
export const clubPreset: PresetFn = ({ ctx, level, push }) => {
  const phase = ctx.institution?.cyclePhase;
  const opening =
    phase === "peak"
      ? OPENING_INSTITUTIONAL_DOMINANT
      : phase === "rise"
        ? OPENING_INSTITUTIONAL_RISING
        : phase === "decline"
          ? OPENING_INSTITUTIONAL_DECLINE
          : OPENING_INSTITUTIONAL_STABLE;
  push("opening", opening.variants, "opening");

  push("positioning", POSITIONING.variants, "positioning");
  if (level === "mini") return;

  const titles = ctx.institution?.titles ?? 0;
  if (titles >= 1) push("cycle", CLUB_CYCLE_TITLES.variants, "cycle-titles");
  else push("cycle", CLUB_CYCLE_CONSISTENCY.variants, "cycle-consistency");

  if (level === "standard") return;
  push(
    "closing",
    (ctx.score.percentile >= 85 ? CLOSING_ELITE : CLOSING_NEUTRAL).variants,
    "closing",
  );
};
