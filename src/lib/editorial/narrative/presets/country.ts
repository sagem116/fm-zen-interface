import type { PresetFn } from "../preset-utils";
import {
  OPENING_ECOSYSTEM_TALENT_ENGINE,
  OPENING_ECOSYSTEM_EMERGING,
  OPENING_ECOSYSTEM_STABLE,
  POSITIONING,
  CLOSING_ELITE,
  CLOSING_NEUTRAL,
} from "../templates";

/**
 * Country preset — ecosystem.
 * Focus: talent production, quality, generations, evolution.
 */
export const countryPreset: PresetFn = ({ ctx, level, push }) => {
  const trend = ctx.ecosystem?.qualityTrend;
  const production = ctx.ecosystem?.talentProduction ?? 0;
  const opening =
    trend === "rising" && production >= 10
      ? OPENING_ECOSYSTEM_TALENT_ENGINE
      : trend === "rising"
        ? OPENING_ECOSYSTEM_EMERGING
        : OPENING_ECOSYSTEM_STABLE;
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
