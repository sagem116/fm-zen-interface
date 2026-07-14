import type { PresetFn } from "../preset-utils";
import {
  OPENING_COMPETITION_STRENGTHENING,
  OPENING_COMPETITION_STABLE,
  OPENING_COMPETITION_DECLINING,
  COMPETITION_TOP_CLUBS,
  POSITIONING,
  CLOSING_NEUTRAL,
  CLOSING_ELITE,
} from "../templates";

/**
 * Competition preset — analytical.
 * Focus: strength evolution, top clubs, international presence.
 */
export const competitionPreset: PresetFn = ({ ctx, level, push }) => {
  const trend = ctx.competitionProfile?.strengthTrend;
  const opening =
    trend === "rising"
      ? OPENING_COMPETITION_STRENGTHENING
      : trend === "declining"
        ? OPENING_COMPETITION_DECLINING
        : OPENING_COMPETITION_STABLE;
  push("opening", opening.variants, "opening");

  push("positioning", POSITIONING.variants, "positioning");
  if (level === "mini") return;

  const top = ctx.competitionProfile?.topClubs ?? [];
  if (top.length >= 2) push("context", COMPETITION_TOP_CLUBS.variants, "top-clubs");

  if (level === "standard") return;
  push(
    "closing",
    (ctx.score.percentile >= 85 ? CLOSING_ELITE : CLOSING_NEUTRAL).variants,
    "closing",
  );
};
