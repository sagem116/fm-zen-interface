import type { PresetFn } from "../preset-utils";
import {
  OPENING_LEGACY_DOMINANCE,
  OPENING_LEGACY_LONGEVITY,
  TRAJECTORY_LEGACY,
  CLOSING_ELITE,
} from "../templates";

/**
 * Hall of Fame preset — legacy.
 * Focus: longevity, dominance, era, impact.
 */
export const hallOfFamePreset: PresetFn = ({ ctx, level, push }) => {
  const longevity = ctx.legacy?.longevitySeasons ?? ctx.evolution.seasonsTracked;
  const dominance = ctx.legacy?.dominance ?? 0;
  const opening = dominance >= 0.5 ? OPENING_LEGACY_DOMINANCE : OPENING_LEGACY_LONGEVITY;
  push("opening", opening.variants, "opening");
  if (level === "mini") return;

  push("legacy", TRAJECTORY_LEGACY.variants, "legacy");
  if (level === "standard") return;

  push("closing", CLOSING_ELITE.variants, "closing");
  // silence unused
  void longevity;
};
